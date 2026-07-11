/**
 * /api/checkout/pesapal/confirm — Client-triggered payment confirmation
 * ─────────────────────────────────────────────────────────────────────────
 * Belt-and-braces fallback for the IPN. The success page polls this endpoint
 * after Pesapal redirects the customer back. If the IPN was delayed, dropped,
 * or failed, this closes the loop and flips the Woo order itself.
 *
 * SECURITY MODEL — identical to the IPN:
 *   - The client supplies ONLY the orderTrackingId (which Pesapal itself
 *     appended to the callback URL).
 *   - Payment status comes from Pesapal's GetTransactionStatus, never from
 *     the client.
 *   - The merchant reference comes from Pesapal's record for that tracking
 *     id, and must match our KAF-{digits} pattern before we touch Woo.
 *   - PENDING/INITIATED never writes to Woo, so polling cannot downgrade
 *     an order the IPN already completed.
 *
 * Race with the IPN is harmless: both write the same terminal status, and
 * WooCommerce treats a same-status PUT as a no-op (no duplicate emails).
 *
 * File location: src/app/api/checkout/pesapal/confirm/route.ts
 */

import { NextRequest, NextResponse } from "next/server";

const PESAPAL_BASE = "https://pay.pesapal.com/v3";
const MERCHANT_REF_PATTERN = /^KAF-(\d+)$/i;

const WC_HOSTNAME = (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com")
  .replace(/\/graphql\/?$/, "")
  .replace(/^https?:\/\//, "");
const ORIGIN_IP = process.env.WP_ORIGIN_IP;
const WC_BASE   = ORIGIN_IP ? `http://${ORIGIN_IP}` : `https://${WC_HOSTNAME}`;
const WC_HEADERS: Record<string, string> = ORIGIN_IP ? { Host: WC_HOSTNAME } : {};

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConfirmPayload {
  orderTrackingId?: string;
}

/** What the success page consumes. */
type ConfirmState = "confirmed" | "pending" | "failed" | "refunded" | "error";

// ── Helpers (kept in sync with the IPN route — consolidate into
//    src/lib/pesapal.ts during the next quiet window) ─────────────────────────

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
    console.error("[Confirm] Token request non-OK:", res.status, text.slice(0, 1500));
    throw new Error(`Pesapal token request failed (${res.status}).`);
  }

  let data: { token?: string; message?: string; error?: { message?: string } };
  try {
    data = JSON.parse(text);
  } catch {
    console.error("[Confirm] Token response not JSON:", text.slice(0, 1500));
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
    case "COMPLETED":           return "processing";
    case "FAILED":
    case "INVALID":             return "failed";
    case "REVERSED":            return "refunded";
    default:                    return "pending";
  }
}

function toConfirmState(wcStatus: string): ConfirmState {
  switch (wcStatus) {
    case "processing": return "confirmed";
    case "failed":     return "failed";
    case "refunded":   return "refunded";
    default:           return "pending";
  }
}

async function updateWooOrder(wcOrderId: string, wcStatus: string, txnId: string): Promise<void> {
  const wcKey = process.env.WC_CONSUMER_KEY || process.env.WP_APP_USER;
  const wcSecret = process.env.WC_CONSUMER_SECRET || process.env.WP_APP_PASS;
  if (!wcKey || !wcSecret) {
    const state = {
      WC_CONSUMER_KEY:    !!process.env.WC_CONSUMER_KEY,
      WC_CONSUMER_SECRET: !!process.env.WC_CONSUMER_SECRET,
      WP_APP_USER:        !!process.env.WP_APP_USER,
      WP_APP_PASS:        !!process.env.WP_APP_PASS,
    };
    console.error("[Confirm] WC creds state:", state);
    throw new Error("Missing WooCommerce credentials.");
  }

  const base64Auth = Buffer.from(`${wcKey}:${wcSecret}`).toString("base64");
  const res = await fetch(`${WC_BASE}/wp-json/wc/v3/orders/${wcOrderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${base64Auth}`,
      ...WC_HEADERS,
    },
    body: JSON.stringify({ status: wcStatus, transaction_id: txnId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Woo order update failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let orderTrackingId = "";

  try {
    const payload = (await request.json()) as ConfirmPayload;
    orderTrackingId = (payload.orderTrackingId || "").trim();
  } catch {
    return NextResponse.json({ state: "error", message: "Invalid request body." }, { status: 400 });
  }

  // Pesapal tracking ids are GUIDs — reject anything that isn't shaped like one
  // before spending a token round-trip on it.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderTrackingId)) {
    return NextResponse.json({ state: "error", message: "Invalid tracking id." }, { status: 400 });
  }

  try {
    // 1. Verify with Pesapal — the ONLY source of truth for payment status.
    const token = await getPesapalToken();
    const verifyRes = await fetch(
      `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
      { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }
    );

    if (!verifyRes.ok) {
      throw new Error(`Status check failed: ${verifyRes.status}`);
    }

    const txn = await verifyRes.json();

    // 2. The merchant reference comes from Pesapal's record — not the client —
    //    and must match our pattern. This is what ties the tracking id to a
    //    specific Woo order safely.
    const pesapalRef = String(txn.merchant_reference ?? txn.merchantReference ?? "").trim();
    const refMatch = pesapalRef.match(MERCHANT_REF_PATTERN);
    if (!refMatch) {
      console.warn(`[Confirm] Rejected: Pesapal ref "${pesapalRef}" doesn't match KAF pattern.`);
      return NextResponse.json({ state: "error", message: "Unrecognised order reference." }, { status: 400 });
    }
    const wcOrderId = refMatch[1];

    // 3. Map status. PENDING/INITIATED → report back, touch nothing.
    const pesapalStatus = String(txn.payment_status_description || "PENDING");
    const wcStatus = mapStatus(pesapalStatus);
    const state = toConfirmState(wcStatus);

    if (state === "pending") {
      return NextResponse.json({ state, merchantRef: pesapalRef });
    }

    // 4. Terminal status → write to Woo. Same-status PUT is a no-op if the
    //    IPN got here first, so no duplicate emails.
    await updateWooOrder(wcOrderId, wcStatus, orderTrackingId);

    console.log(`[Confirm] Order ${pesapalRef} → Pesapal: ${pesapalStatus} → WC: ${wcStatus} (fallback path)`);

    return NextResponse.json({ state, merchantRef: pesapalRef });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[Confirm] Error:", message);
    // "error" tells the poller to keep trying — a transient Pesapal/Woo blip
    // shouldn't show the customer a failure screen.
    return NextResponse.json({ state: "error", message: "Confirmation temporarily unavailable." }, { status: 200 });
  }
}