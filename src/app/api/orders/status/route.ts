/**
 * /api/orders/status — Real payment verification for the success page
 * -------------------------------------------------------------------
 * The success page polls this with the OrderTrackingId that Pesapal appends
 * to the callback URL. Replaces the old timer-based "Payment Confirmed!".
 *
 * - Talks to pay.pesapal.com directly → unaffected by the kafundawines.com
 *   SSL chain / WAF issues. Safe to ship today.
 * - Transient upstream errors return { status: "pending", retryable: true }
 *   with HTTP 200 so the page keeps polling instead of falsely telling a
 *   customer their payment failed. The page caps polling and falls back to
 *   the "we'll confirm on a call" flow.
 * - Token cached in-memory (same interim pattern as the idempotency cache).
 *
 * Env: PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET (already in the set).
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PESAPAL_BASE = "https://pay.pesapal.com/v3";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getPesapalToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("Missing Pesapal credentials.");

  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[orders/status] Token request non-OK:", res.status, text.slice(0, 500));
    throw new Error(`Pesapal token request failed (${res.status})`);
  }

  const data = await res.json();
  if (!data?.token) throw new Error("Pesapal auth: no token in response.");

  cachedToken = {
    token: data.token,
    // Pesapal tokens last ~5 minutes; trust expiryDate when present.
    expiresAt: data.expiryDate
      ? new Date(data.expiryDate).getTime()
      : Date.now() + 4 * 60_000,
  };

  return data.token;
}

type ClientStatus = "pending" | "completed" | "failed" | "reversed" | "invalid";

/** Pesapal status_code: 0 = INVALID, 1 = COMPLETED, 2 = FAILED, 3 = REVERSED. */
function mapStatus(statusCode: number | undefined, description: string | undefined): ClientStatus {
  switch (statusCode) {
    case 1: return "completed";
    case 2: return "failed";
    case 3: return "reversed";
    case 0: return "invalid";
  }
  const d = (description || "").toLowerCase();
  if (d === "completed") return "completed";
  if (d === "failed") return "failed";
  if (d === "reversed") return "reversed";
  if (d === "invalid") return "invalid";
  return "pending";
}

export async function GET(req: NextRequest) {
  const orderTrackingId = req.nextUrl.searchParams.get("orderTrackingId");

  if (!orderTrackingId) {
    return NextResponse.json({ error: "orderTrackingId is required" }, { status: 400 });
  }

  // Pesapal tracking ids are GUIDs — cheap shape guard before proxying.
  if (!/^[0-9a-f-]{20,40}$/i.test(orderTrackingId)) {
    return NextResponse.json({ error: "Invalid orderTrackingId" }, { status: 400 });
  }

  try {
    const token = await getPesapalToken();

    const res = await fetch(
      `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
      {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      if (res.status === 401) cachedToken = null; // re-auth on next poll
      console.warn(`[orders/status] Pesapal returned ${res.status}`);
      return NextResponse.json(
        { status: "pending" as ClientStatus, retryable: true },
        { status: 200 }
      );
    }

    const txn = await res.json();
    const status = mapStatus(txn?.status_code, txn?.payment_status_description);

    return NextResponse.json({
      status,
      merchantReference: txn?.merchant_reference ?? null,
      confirmationCode: txn?.confirmation_code ?? null,
      paymentMethod: txn?.payment_method ?? null,
      amount: txn?.amount ?? null,
      currency: txn?.currency ?? null,
    });
  } catch (err) {
    console.error("[orders/status] Lookup failed:", err);
    // Never surface a hard failure for a transient error — keep the page polling.
    return NextResponse.json(
      { status: "pending" as ClientStatus, retryable: true },
      { status: 200 }
    );
  }
}