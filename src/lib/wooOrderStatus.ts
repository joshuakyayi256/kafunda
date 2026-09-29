/**
 * Safe WooCommerce order-status writes for the payment flow.
 * -------------------------------------------------------------------------
 * WooCommerce sends an email on EVERY status transition. The IPN, the
 * confirm route, the return page and the cancel button can all report on
 * the same order, so blind PUTs made unpaid orders flip failed ⇄ cancelled
 * and fired a stream of "order cancelled / failed" emails.
 *
 * Rules (current → target):
 *   - same status                      → no write
 *   - pending        → anything        → write
 *   - failed/cancelled → processing    → write (late payment — money wins)
 *   - failed ⇄ cancelled               → no write (already closed as unpaid)
 *   - processing/completed → refunded  → write (Pesapal reversal)
 *   - processing/completed → failed/cancelled/pending → never (paid stays paid)
 */

const WC_HOSTNAME = (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com")
  .replace(/\/graphql\/?$/, "")
  .replace(/^https?:\/\//, "");
const ORIGIN_IP = process.env.WP_ORIGIN_IP;
const WC_BASE = ORIGIN_IP ? `http://${ORIGIN_IP}` : `https://${WC_HOSTNAME}`;
const WC_HEADERS: Record<string, string> = ORIGIN_IP ? { Host: WC_HOSTNAME } : {};

/**
 * "checkout-draft" is WooCommerce's hidden Draft status (used by its own block
 * checkout): not listed under "All" orders, sends no emails, and Woo deletes
 * stale drafts by itself. Pesapal orders live there until they're PAID, so the
 * shop only ever sees real orders — and unpaid ones never trigger emails.
 */
export type TargetStatus = "processing" | "failed" | "cancelled" | "refunded" | "checkout-draft";

function authHeaders(): Record<string, string> {
  const wcKey = process.env.WC_CONSUMER_KEY || process.env.WP_APP_USER;
  const wcSecret = process.env.WC_CONSUMER_SECRET || process.env.WP_APP_PASS;
  if (!wcKey || !wcSecret) throw new Error("Missing WooCommerce credentials.");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from(`${wcKey}:${wcSecret}`).toString("base64")}`,
    ...WC_HEADERS,
  };
}

export async function getWooOrderStatus(wcOrderId: string): Promise<string | null> {
  const res = await fetch(`${WC_BASE}/wp-json/wc/v3/orders/${wcOrderId}?_fields=id,status`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Woo order lookup failed (${res.status}).`);
  const data = (await res.json()) as { status?: string };
  return data.status ?? null;
}

export function shouldTransition(current: string | null, target: TargetStatus): boolean {
  if (!current) return true;
  if (current === target) return false;
  // Hidden draft: only a real payment brings it into the orders list. A
  // failed/cancelled/abandoned payment leaves it hidden — no email, no clutter.
  if (current === "checkout-draft") return target === "processing";
  if (current === "pending" || current === "on-hold") return true;
  const unpaidClosed = current === "failed" || current === "cancelled";
  const paid = current === "processing" || current === "completed";
  if (unpaidClosed) return target === "processing";
  if (paid) return target === "refunded";
  return false; // refunded / trash / anything else: leave alone
}

/**
 * Move an order to `target` if the rules allow it. Returns true when a write
 * happened. Paid transitions also set_paid so Woo records the payment.
 */
export async function setWooOrderStatus(
  wcOrderId: string,
  target: TargetStatus,
  txnId: string
): Promise<boolean> {
  const current = await getWooOrderStatus(wcOrderId);
  if (!shouldTransition(current, target)) return false;

  // Draft → paid: step through "pending" first. WooCommerce's "New order"
  // (shop) and "Processing order" (customer) emails are wired to
  // pending→processing, not draft→processing — this guarantees they fire.
  if (current === "checkout-draft" && target === "processing") {
    await putStatus(wcOrderId, { status: "pending" });
  }

  const res = await putStatus(wcOrderId, {
    status: target,
    transaction_id: txnId,
    ...(target === "processing" ? { set_paid: true } : {}),
  }, /* allowFail */ target === "checkout-draft");

  // Hiding an unpaid order as a draft isn't supported on this store →
  // close it as cancelled instead (the previous behaviour).
  if (!res.ok && target === "checkout-draft") {
    await putStatus(wcOrderId, { status: "cancelled", transaction_id: txnId });
  }
  return true;
}

async function putStatus(
  wcOrderId: string,
  body: Record<string, unknown>,
  allowFail = false
): Promise<Response> {
  const res = await fetch(`${WC_BASE}/wp-json/wc/v3/orders/${wcOrderId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok && !allowFail) {
    const text = await res.text();
    throw new Error(`Woo order update failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res;
}
