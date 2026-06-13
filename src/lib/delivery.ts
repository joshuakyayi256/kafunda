/**
 * src/lib/delivery.ts — Distance-based delivery quote engine
 * ----------------------------------------------------------
 * Single source of truth for the delivery fee. Used by BOTH:
 *   - /api/delivery/quote          (live quote shown at checkout)
 *   - /api/checkout/pesapal + /cod (authoritative recalculation — the
 *                                   client's displayed fee is never trusted)
 *
 * Distance = Mapbox DRIVING distance from the customer's pinned location to
 * the NEAREST store in STORES (Directions Matrix API, one call for all
 * stores). Tariff lives in DELIVERY_FEE in constants.ts.
 *
 * Env: MAPBOX_TOKEN (server) — falls back to NEXT_PUBLIC_MAPBOX_TOKEN, which
 * the map widget needs anyway. A public (pk.) token works for the Matrix and
 * Geocoding APIs; restrict it to your domains in the Mapbox dashboard.
 *
 * Design rule: a quote failure NEVER blocks checkout. Callers fall back to
 * the previous behaviour (fee confirmed on the call) when ok === false.
 */

import { STORES, DELIVERY_FEE } from "@/lib/constants";

export interface DeliveryQuote {
  feeUgx: number;
  distanceKm: number;   // driving distance, 1 decimal
  durationMin: number;  // driving time, rounded
  storeId: string;
  storeName: string;
}

export type QuoteResult =
  | { ok: true; quote: DeliveryQuote }
  | { ok: false; reason: "out_of_range" | "unavailable" };

const MAPBOX_TOKEN =
  process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/** Rough Uganda bounding box — rejects junk coordinates before they reach Mapbox. */
export function isInUganda(lat: number, lng: number): boolean {
  return lat >= -1.6 && lat <= 4.4 && lng >= 29.4 && lng <= 35.2;
}

/** Pure tariff math — exported so it can be unit-tested / reused. */
export function computeFeeUgx(distanceKm: number): number {
  const raw = DELIVERY_FEE.BASE_UGX + DELIVERY_FEE.PER_KM_UGX * distanceKm;
  const floored = Math.max(raw, DELIVERY_FEE.MIN_UGX);
  const step = DELIVERY_FEE.ROUND_UP_TO_UGX;
  return Math.ceil(floored / step) * step;
}

/**
 * Quote delivery to (lat, lng). One Matrix call covers every store:
 * coordinates = [store0, store1, ..., customer], sources = store indices,
 * destinations = the customer. We then take the nearest routable store.
 */
export async function getDeliveryQuote(lat: number, lng: number): Promise<QuoteResult> {
  if (!MAPBOX_TOKEN) {
    console.warn("[delivery] No MAPBOX_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN set.");
    return { ok: false, reason: "unavailable" };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInUganda(lat, lng)) {
    return { ok: false, reason: "out_of_range" };
  }

  const coords = [
    ...STORES.map((s) => `${s.lng},${s.lat}`),
    `${lng},${lat}`,
  ].join(";");
  const sources = STORES.map((_, i) => i).join(";");
  const destination = STORES.length; // customer is the last coordinate

  const url =
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}` +
    `?sources=${sources}&destinations=${destination}` +
    `&annotations=distance,duration&access_token=${MAPBOX_TOKEN}`;

  let data: {
    code?: string;
    distances?: (number | null)[][];
    durations?: (number | null)[][];
  };

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[delivery] Mapbox Matrix returned ${res.status}`);
      return { ok: false, reason: "unavailable" };
    }
    data = await res.json();
  } catch (err) {
    console.error("[delivery] Mapbox Matrix fetch failed:", err);
    return { ok: false, reason: "unavailable" };
  }

  if (data.code !== "Ok" || !data.distances) {
    console.error("[delivery] Mapbox Matrix unexpected response:", data.code);
    return { ok: false, reason: "unavailable" };
  }

  // Pick the nearest store with a routable result.
  let best: { idx: number; meters: number; seconds: number } | null = null;
  for (let i = 0; i < STORES.length; i++) {
    const meters = data.distances[i]?.[0];
    const seconds = data.durations?.[i]?.[0] ?? null;
    if (typeof meters === "number" && Number.isFinite(meters)) {
      if (!best || meters < best.meters) {
        best = { idx: i, meters, seconds: typeof seconds === "number" ? seconds : 0 };
      }
    }
  }

  if (!best) return { ok: false, reason: "unavailable" };

  const distanceKm = Math.round((best.meters / 1000) * 10) / 10;
  if (distanceKm > DELIVERY_FEE.MAX_RADIUS_KM) {
    return { ok: false, reason: "out_of_range" };
  }

  const store = STORES[best.idx];
  return {
    ok: true,
    quote: {
      feeUgx: computeFeeUgx(distanceKm),
      distanceKm,
      durationMin: Math.max(1, Math.round(best.seconds / 60)),
      storeId: store.id,
      storeName: store.name,
    },
  };
}