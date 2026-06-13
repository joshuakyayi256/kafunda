/**
 * /api/revalidate - Cache-bust webhook
 * --------------------------------------------------------------------------
 * WooCommerce calls this whenever a product changes (create / update /
 * delete / stock change). It invalidates the tagged product + category
 * caches so the storefront refreshes within seconds of a real change,
 * while staying fully cached (zero Woo calls) the rest of the time.
 *
 * Setup:
 *  1. Set REVALIDATE_SECRET in Vercel (any long random string).
 *  2. In wp-admin -> WooCommerce -> Settings -> Advanced -> Webhooks,
 *     create webhooks (all with Delivery URL below, status Active):
 *        - Topic: Product created
 *        - Topic: Product updated   (also fires on stock changes)
 *        - Topic: Product deleted
 *        - Topic: Product restored
 *     Delivery URL:
 *        https://kafundawines.com/api/revalidate?secret=YOUR_SECRET
 *
 * Manual trigger (e.g. after bulk-editing products):
 *     GET https://kafundawines.com/api/revalidate?secret=YOUR_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

function authorized(request: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.error("[Revalidate] REVALIDATE_SECRET is not set.");
    return false;
  }
  return request.nextUrl.searchParams.get("secret") === secret;
}

function bustCaches(topic: string | null) {
  // Tagged fetch caches (lib/api.ts).
  // Next.js 16: the second argument (cacheLife profile) is required.
  // 'max' = stale-while-revalidate — visitors keep getting the cached page
  // instantly while fresh data loads in the background.
  revalidateTag("products", "max");
  revalidateTag("categories", "max");
  // ISR'd pages that compose product data
  revalidatePath("/");
  revalidatePath("/shop");

  console.log(`[Revalidate] Cache busted${topic ? ` (topic: ${topic})` : ""} at ${new Date().toISOString()}`);
}

/** WooCommerce webhooks deliver as POST. */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Invalid secret." }, { status: 401 });
  }

  const topic = request.headers.get("x-wc-webhook-topic");

  // WooCommerce sends a "ping" delivery when a webhook is first saved;
  // acknowledge anything that arrives so the webhook stays healthy.
  bustCaches(topic);

  return NextResponse.json({ revalidated: true, topic, now: Date.now() });
}

/** Manual trigger for humans (browser-friendly). */
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Invalid secret." }, { status: 401 });
  }

  bustCaches("manual");

  return NextResponse.json({ revalidated: true, topic: "manual", now: Date.now() });
}