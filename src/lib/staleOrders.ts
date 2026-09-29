/**
 * Cancel unpaid Pesapal orders that have been sitting in "Pending payment".
 * -------------------------------------------------------------------------
 * The Woo order has to exist BEFORE the customer pays (Pesapal charges
 * against its KAF-{id} reference), so every abandoned payment — browser
 * closed, phone died, customer walked away — would otherwise stay pending
 * forever. After STALE_AFTER_MIN minutes an unpaid order is closed as
 * "cancelled".
 *
 * Safe against late payments: if Pesapal does complete one afterwards, the
 * IPN (and /api/checkout/confirm) write processing + set_paid, which moves
 * a cancelled order straight back to paid.
 *
 * Runs from the daily cron (/api/cron/cancel-stale-orders) and, throttled,
 * after each new Pesapal checkout so it keeps up between cron runs.
 */

const STALE_AFTER_MIN = 60;
const THROTTLE_MS = 10 * 60 * 1000;

const WC_HOSTNAME = (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com")
  .replace(/\/graphql\/?$/, "")
  .replace(/^https?:\/\//, "");
const ORIGIN_IP = process.env.WP_ORIGIN_IP;
const WC_BASE = ORIGIN_IP ? `http://${ORIGIN_IP}` : `https://${WC_HOSTNAME}`;
const WC_HEADERS: Record<string, string> = ORIGIN_IP ? { Host: WC_HOSTNAME } : {};

let lastRunAt = 0;

function authHeaders(): Record<string, string> {
  const wcKey = process.env.WC_CONSUMER_KEY || process.env.WP_APP_USER;
  const wcSecret = process.env.WC_CONSUMER_SECRET || process.env.WP_APP_PASS;
  if (!wcKey || !wcSecret) throw new Error("Missing WooCommerce credentials.");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(`${wcKey}:${wcSecret}`).toString("base64")}`,
    ...WC_HEADERS,
  };
}

interface WooOrderLite {
  id: number;
  payment_method?: string;
  date_created_gmt?: string;
}

/** Returns the ids of the orders it cancelled. */
export async function cancelStalePesapalOrders(): Promise<number[]> {
  const headers = authHeaders();
  // Woo's `before` filter is ISO-8601 in site-local time; comparing on
  // date_created_gmt below keeps the cut-off exact regardless.
  const cutoff = Date.now() - STALE_AFTER_MIN * 60 * 1000;
  const before = new Date(cutoff).toISOString().slice(0, 19);

  const res = await fetch(
    `${WC_BASE}/wp-json/wc/v3/orders?status=pending&before=${before}&per_page=100&_fields=id,payment_method,date_created_gmt`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Pending order lookup failed (${res.status}).`);
  const orders = (await res.json()) as WooOrderLite[];

  const stale = orders.filter((o) => {
    if (o.payment_method !== "pesapal") return false;
    const created = o.date_created_gmt ? Date.parse(`${o.date_created_gmt}Z`) : NaN;
    return Number.isFinite(created) && created < cutoff;
  });
  if (stale.length === 0) return [];

  const batch = await fetch(`${WC_BASE}/wp-json/wc/v3/orders/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({ update: stale.map((o) => ({ id: o.id, status: "cancelled" })) }),
  });
  if (!batch.ok) throw new Error(`Stale order cancel failed (${batch.status}).`);

  // Leave a note on each so the shop can see why it was closed.
  await Promise.allSettled(
    stale.map((o) =>
      fetch(`${WC_BASE}/wp-json/wc/v3/orders/${o.id}/notes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          note: `Auto-cancelled: Pesapal payment not completed within ${STALE_AFTER_MIN} minutes. If the customer pays later, the payment notification will mark it paid automatically.`,
        }),
      })
    )
  );

  const ids = stale.map((o) => o.id);
  console.log(`[staleOrders] Cancelled ${ids.length} unpaid Pesapal order(s): ${ids.join(", ")}`);
  return ids;
}

/** Fire-and-forget variant for request handlers: at most once per 10 min per instance. */
export async function cancelStalePesapalOrdersThrottled(): Promise<void> {
  if (Date.now() - lastRunAt < THROTTLE_MS) return;
  lastRunAt = Date.now();
  try {
    await cancelStalePesapalOrders();
  } catch (err) {
    console.error("[staleOrders] Cleanup failed:", err);
  }
}
