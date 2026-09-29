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

import { getPesapalPaymentStatus } from "@/lib/pesapalStatus";
import { setWooOrderStatus } from "@/lib/wooOrderStatus";

const STALE_AFTER_MIN = 60;
const THROTTLE_MS = 10 * 60 * 1000;
/**
 * Woo emails "Cancelled order" for every order we close. The first run after
 * launch swept the whole pending backlog at once and sent a burst of emails,
 * so: only look at recent orders, and close a few per run at most.
 */
const LOOKBACK_DAYS = 3;
const MAX_PER_RUN = 5;

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
  transaction_id?: string;
  meta_data?: { key: string; value: string }[];
}

/** Returns the ids of the orders it cancelled. */
export async function cancelStalePesapalOrders(): Promise<number[]> {
  const headers = authHeaders();
  // Woo's `before` filter is ISO-8601 in site-local time; comparing on
  // date_created_gmt below keeps the cut-off exact regardless.
  const cutoff = Date.now() - STALE_AFTER_MIN * 60 * 1000;
  const before = new Date(cutoff).toISOString().slice(0, 19);
  const after = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 19);

  const res = await fetch(
    `${WC_BASE}/wp-json/wc/v3/orders?status=pending&before=${before}&after=${after}` +
      `&orderby=date&order=asc&per_page=${MAX_PER_RUN * 4}` +
      `&_fields=id,payment_method,date_created_gmt,transaction_id,meta_data`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Pending order lookup failed (${res.status}).`);
  const orders = (await res.json()) as WooOrderLite[];

  const stale = orders
    .filter((o) => {
      if (o.payment_method !== "pesapal") return false;
      const created = o.date_created_gmt ? Date.parse(`${o.date_created_gmt}Z`) : NaN;
      return Number.isFinite(created) && created < cutoff;
    })
    .slice(0, MAX_PER_RUN);
  if (stale.length === 0) return [];

  const cancelled: number[] = [];
  for (const o of stale) {
    const id = String(o.id);
    const trackingId =
      o.meta_data?.find((m) => m.key === "_pesapal_tracking_id")?.value || o.transaction_id || "";

    // NEVER close an order we can't prove is unpaid. With a tracking id we
    // ask Pesapal first: a payment whose confirmation got lost is recovered
    // (→ processing, which fires the shop's "New order" email) instead of
    // being cancelled.
    let note = `Auto-cancelled: Pesapal payment not completed within ${STALE_AFTER_MIN} minutes. If the customer pays later, the payment notification will mark it paid automatically.`;
    if (trackingId) {
      let status: string;
      try {
        status = await getPesapalPaymentStatus(String(trackingId));
      } catch (err) {
        console.warn(`[staleOrders] Order ${id}: Pesapal check failed, leaving pending this run.`, err);
        continue;
      }
      if (status === "COMPLETED") {
        await setWooOrderStatus(id, "processing", String(trackingId));
        await addNote(id, "Payment confirmed with Pesapal by the order check (confirmation had not arrived). Marked paid.", headers);
        console.log(`[staleOrders] Order ${id}: RECOVERED a paid order.`);
        continue;
      }
      if (status === "REVERSED") continue; // leave for a human
      if (status !== "FAILED" && status !== "INVALID") {
        // PENDING / unknown: Pesapal hasn't settled it — don't guess.
        continue;
      }
      note = `Auto-cancelled: Pesapal reports the payment as ${status} (not paid).`;
    }

    if (await setWooOrderStatus(id, "cancelled", String(trackingId || ""))) {
      await addNote(id, note, headers);
      cancelled.push(o.id);
    }
  }

  if (cancelled.length) {
    console.log(`[staleOrders] Cancelled ${cancelled.length} unpaid Pesapal order(s): ${cancelled.join(", ")}`);
  }
  return cancelled;
}

async function addNote(id: string, note: string, headers: Record<string, string>) {
  await fetch(`${WC_BASE}/wp-json/wc/v3/orders/${id}/notes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ note }),
  }).catch(() => undefined);
}

/**
 * Record Pesapal's tracking id on the Woo order right after checkout starts
 * (meta only — no status change, no email), so the cleanup above can always
 * verify an order with Pesapal before touching it.
 */
export async function saveTrackingIdOnOrder(wcOrderId: number, trackingId: string): Promise<void> {
  try {
    const res = await fetch(`${WC_BASE}/wp-json/wc/v3/orders/${wcOrderId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ meta_data: [{ key: "_pesapal_tracking_id", value: trackingId }] }),
    });
    if (!res.ok) console.warn(`[staleOrders] Could not save tracking id on ${wcOrderId} (${res.status}).`);
  } catch (err) {
    console.warn(`[staleOrders] Could not save tracking id on ${wcOrderId}:`, err);
  }
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
