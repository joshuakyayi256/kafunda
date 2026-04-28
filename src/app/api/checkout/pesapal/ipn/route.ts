/**
 * /api/checkout/pesapal/ipn — Pesapal Instant Payment Notification (IPN)
 * ─────────────────────────────────────────────────────────────────────────
 * Pesapal calls this GET endpoint after a payment attempt.
 * We verify the transaction status with Pesapal, then update the
 * corresponding WooCommerce order accordingly.
 *
 * Pesapal will retry this URL if it doesn't receive a 200 response.
 */

import { NextRequest, NextResponse } from "next/server";

const PESAPAL_BASE = "https://pay.pesapal.com/v3";
const WC_BASE =
  (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com").replace(
    /\/graphql\/?$/,
    ""
  );

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getPesapalToken(): Promise<string> {
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;

  if (!key || !secret) throw new Error("Missing Pesapal env vars.");

  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
  });

  const data = await res.json();
  if (!data.token) throw new Error("Pesapal did not return a token.");
  return data.token as string;
}

/** Map Pesapal payment_status_description → WooCommerce order status */
function mapStatus(pesapalStatus: string): string {
  switch (pesapalStatus?.toUpperCase()) {
    case "COMPLETED":
      return "processing"; // WooCommerce: payment received, fulfil order
    case "FAILED":
    case "INVALID":
      return "failed";
    case "REVERSED":
      return "refunded";
    default:
      return "pending"; // PENDING / INITIATED
  }
}

async function updateWooOrder(wcOrderId: string, wcStatus: string, txnId: string) {
  const wcKey = process.env.WC_CONSUMER_KEY;
  const wcSecret = process.env.WC_CONSUMER_SECRET;
  if (!wcKey || !wcSecret) throw new Error("Missing WooCommerce env vars.");

  const url = `${WC_BASE}/wp-json/wc/v3/orders/${wcOrderId}?consumer_key=${wcKey}&consumer_secret=${wcSecret}`;

  await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      status: wcStatus,
      transaction_id: txnId,
    }),
  });
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantReference = searchParams.get("OrderMerchantReference"); // e.g. "KAF-1234"
  const notificationId = searchParams.get("OrderNotificationType");

  // Pesapal requires a 200 with specific body to stop retries
  if (!orderTrackingId || !merchantReference) {
    return NextResponse.json({ orderNotificationType: notificationId, orderTrackingId, orderMerchantReference: merchantReference, status: "400", message: "Missing required query params." }, { status: 200 });
  }

  try {
    // 1. Get a fresh token to verify with Pesapal
    const token = await getPesapalToken();

    // 2. Verify the transaction status
    const verifyRes = await fetch(
      `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!verifyRes.ok) {
      throw new Error(`Status check failed: ${verifyRes.status}`);
    }

    const txn = await verifyRes.json();
    const pesapalStatus: string = txn.payment_status_description || "PENDING";
    const wcStatus = mapStatus(pesapalStatus);

    // 3. Extract WooCommerce order ID from the merchant reference "KAF-{id}"
    const wcOrderId = merchantReference.replace(/^KAF-/i, "");

    if (wcOrderId) {
      await updateWooOrder(wcOrderId, wcStatus, orderTrackingId);
    }

    console.log(`[IPN] Order ${merchantReference} → Pesapal: ${pesapalStatus} → WC: ${wcStatus}`);

    // Pesapal expects this exact response shape to confirm receipt
    return NextResponse.json({
      orderNotificationType: notificationId,
      orderTrackingId,
      orderMerchantReference: merchantReference,
      status: "200",
      message: "IPN received successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[IPN] Error:", message);

    // Still return 200 with error info — otherwise Pesapal will spam retries
    return NextResponse.json({
      orderNotificationType: notificationId,
      orderTrackingId,
      orderMerchantReference: merchantReference,
      status: "500",
      message,
    });
  }
}
