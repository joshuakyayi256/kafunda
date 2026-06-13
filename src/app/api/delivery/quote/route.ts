/**
 * /api/delivery/quote — Live delivery-fee quote for checkout
 * ----------------------------------------------------------
 * POST { lat, lng } → { ok: true, quote } | { ok: false, reason }
 *
 * Display-only: the checkout UI uses this to show the fee instantly.
 * The payment routes (/api/checkout/pesapal, /api/checkout/cod) recompute
 * the fee server-side from the same engine — this response is never the
 * amount actually charged.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDeliveryQuote, isInUganda } from "@/lib/delivery";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { lat?: unknown; lng?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInUganda(lat, lng)) {
    return NextResponse.json({ ok: false, reason: "out_of_range" }, { status: 200 });
  }

  const result = await getDeliveryQuote(lat, lng);
  return NextResponse.json(result, { status: 200 });
}