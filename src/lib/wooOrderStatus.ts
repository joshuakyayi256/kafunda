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

export type TargetStatus = "processing" | "failed" | "cancelled" | "refunded";

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
  if (current === "pending" || current === "on-hold" || current === "checkout-draft") return true;
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

  const res = await fetch(`${WC_BASE}/wp-json/wc/v3/orders/${wcOrderId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      status: target,
      transaction_id: txnId,
      ...(target === "processing" ? { set_paid: true } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Woo order update failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return true;
}
