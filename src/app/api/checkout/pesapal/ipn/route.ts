/**
 * /api/checkout/pesapal/ipn — Pesapal Instant Payment Notification (IPN)
 * ─────────────────────────────────────────────────────────────────────────
 * Pesapal calls this GET endpoint after a payment attempt.
 *
 * Verification flow:
 *   1. Validate query params are present and well-formed.
 *   2. Validate merchant reference matches our pattern (KAF-{digits}).
 *   3. Call Pesapal's GetTransactionStatus with the tracking id.
 *   4. Cross-check that Pesapal's record of the merchant_reference matches
 *      the one in the IPN query string. This stops attackers from passing
 *      a real tracking id with a forged merchant ref to mark someone else's
 *      order as paid.
 *   5. Update the WooCommerce order accordingly — but NEVER downgrade an
 *      order back to "pending" (late/duplicate IPNs with PENDING status
 *      must not undo a completed payment).
 *
 * Pesapal will retry until we return a 200 with the expected body shape,
 * so always return 200 — even on errors — to avoid retry storms.
 *
 * FIX 2026-07-11: PESAPAL_BASE previously had the full RegisterIPN path
 * baked in ("https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN"), which
 * made every token request and status check hit a 404. Result: no IPN was
 * ever processed, orders never left "pending", and no Woo emails fired.
 */

import { NextRequest, NextResponse } from "next/server";
import { setWooOrderStatus, type TargetStatus } from "@/lib/wooOrderStatus";

const PESAPAL_BASE = "https://pay.pesapal.com/v3";
const MERCHANT_REF_PATTERN = /^KAF-(\d+)$/i;


// ── Helpers ────────────────────────────────────────────────────────────────────

async function getPesapalToken(): Promise<string> {
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("Missing Pesapal credentials.");

  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("[IPN] Token request non-OK:", res.status, text.slice(0, 1500));
    throw new Error(`Pesapal token request failed (${res.status}).`);
  }

  let data: { token?: string; message?: string; error?: { message?: string } };
  try {
    data = JSON.parse(text);
  } catch {
    console.error("[IPN] Token response not JSON:", text.slice(0, 1500));
    throw new Error("Pesapal returned a non-JSON token response.");
  }

  if (!data.token) {
    const reason = data.message || data.error?.message || JSON.stringify(data).slice(0, 300);
    throw new Error(`Pesapal token refused: ${reason}`);
  }

  return data.token;
}

/** Map Pesapal payment_status_description → WooCommerce order status. */
function mapStatus(pesapalStatus: string): string {
  switch (pesapalStatus?.toUpperCase()) {
    case "COMPLETED":           return "processing"; // payment received, fulfil
    case "FAILED":              return "failed";
    case "REVERSED":            return "refunded";
    // PENDING / INITIATED / INVALID (no payment attempt recorded) → no write;
    // the stale-order cleanup closes abandoned orders quietly.
    default:                    return "pending";
  }
}

/** Pesapal expects this response shape with a 200 status to stop retries. */
function ipnAck(
  orderTrackingId: string | null,
  merchantRef: string | null,
  notificationType: string | null,
  status: "200" | "400" | "500",
  message: string,
) {
  return NextResponse.json({
    orderNotificationType: notificationType,
    orderTrackingId,
    orderMerchantReference: merchantRef,
    status,
    message,
  });
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantRefRaw  = searchParams.get("OrderMerchantReference");
  const notificationType = searchParams.get("OrderNotificationType");

  // 1. Required-fields check
  if (!orderTrackingId || !merchantRefRaw) {
    console.warn("[IPN] Missing required query params.");
    return ipnAck(orderTrackingId, merchantRefRaw, notificationType, "400", "Missing required query params.");
  }

  // 2. Merchant reference must match our pattern
  const merchantRef = merchantRefRaw.trim();
  const refMatch = merchantRef.match(MERCHANT_REF_PATTERN);
  if (!refMatch) {
    console.warn(`[IPN] Rejected: bad merchant reference shape "${merchantRef}".`);
    return ipnAck(orderTrackingId, merchantRef, notificationType, "400", "Invalid merchant reference.");
  }
  const wcOrderId = refMatch[1];

  try {
    // 3. Verify status with Pesapal
    const token = await getPesapalToken();
    const verifyRes = await fetch(
      `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
      { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }
    );

    if (!verifyRes.ok) {
      throw new Error(`Status check failed: ${verifyRes.status}`);
    }

    const txn = await verifyRes.json();

    // 4. CRITICAL: cross-check the merchant reference Pesapal has on file for
    //    this tracking id matches what was in the IPN query string. Without
    //    this, an attacker could pass any tracking id + any merchant ref.
    const pesapalRef = String(
      txn.merchant_reference ?? txn.merchantReference ?? ""
    ).trim();

    if (!pesapalRef || pesapalRef.toLowerCase() !== merchantRef.toLowerCase()) {
      console.warn(
        `[IPN] Rejected: merchant reference mismatch. ` +
        `IPN said "${merchantRef}", Pesapal said "${pesapalRef}".`
      );
      return ipnAck(orderTrackingId, merchantRef, notificationType, "400", "Merchant reference mismatch.");
    }

    // 5. Map status and update Woo. Never write "pending" — a late or
    //    duplicate IPN carrying PENDING/INITIATED must not downgrade an
    //    order that has already been marked processing/failed/refunded.
    const pesapalStatus = String(txn.payment_status_description || "PENDING");
    const wcStatus = mapStatus(pesapalStatus);

    if (wcStatus === "pending") {
      console.log(`[IPN] Order ${merchantRef} still ${pesapalStatus} — no Woo update.`);
      return ipnAck(orderTrackingId, merchantRef, notificationType, "200", "IPN received; payment not final yet.");
    }

    // Only real transitions are written (lib/wooOrderStatus.ts) — a repeat or
    // late IPN never re-fires Woo status emails or downgrades a paid order.
    await setWooOrderStatus(wcOrderId, wcStatus as TargetStatus, orderTrackingId);

    console.log(`[IPN] Order ${merchantRef} → Pesapal: ${pesapalStatus} → WC: ${wcStatus}`);

    return ipnAck(orderTrackingId, merchantRef, notificationType, "200", "IPN received successfully.");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[IPN] Error:", message);
    // Still return 200 so Pesapal stops retrying — error is logged server-side.
    return ipnAck(orderTrackingId, merchantRef, notificationType, "500", "Internal IPN processing error.");
  }
}