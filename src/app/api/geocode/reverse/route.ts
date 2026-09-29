/**
 * /api/geocode/reverse?lat=..&lng=.. — exact address for a delivery pin.
 * -------------------------------------------------------------------------
 * Mapbox's geocoder has almost no street/building data for Uganda, so a pin
 * in central Kampala came back as just "Kampala". OpenStreetMap (Nominatim)
 * has the same detailed data the map shows — building/place names, roads,
 * neighbourhoods — so we ask it here, server-side, so we can:
 *   - send the identifying User-Agent Nominatim's usage policy requires,
 *   - cache results (same pin → no repeat lookups).
 * Returns { label } or { label: null } — the picker then falls back to Mapbox.
 */

import { NextRequest, NextResponse } from "next/server";
import { isInUganda } from "@/lib/delivery";

const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "KafundaWines/1.0 (+https://shop.kafundawines.com; info@kafundawines.com)";

interface NominatimAddress {
  amenity?: string; shop?: string; building?: string; office?: string;
  tourism?: string; leisure?: string; commercial?: string; retail?: string;
  house_number?: string; road?: string;
  neighbourhood?: string; quarter?: string; suburb?: string; hamlet?: string;
  city_district?: string; city?: string; town?: string; village?: string; county?: string;
}

interface NominatimResult {
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
}

function buildLabel(r: NominatimResult): string | null {
  const a = r.address || {};
  const place =
    r.name || a.amenity || a.shop || a.building || a.office || a.tourism ||
    a.leisure || a.commercial || a.retail || "";
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const area = a.neighbourhood || a.quarter || a.suburb || a.hamlet || "";
  const town = a.city || a.town || a.village || a.city_district || a.county || "";

  const parts: string[] = [];
  for (const p of [place, street, area, town]) {
    const v = p.trim();
    if (v && !parts.some((x) => x.toLowerCase() === v.toLowerCase())) parts.push(v);
  }
  // Only the town/city isn't an address — let the caller fall back.
  if (parts.length < 2) return null;
  return parts.join(", ");
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInUganda(lat, lng)) {
    return NextResponse.json({ label: null }, { status: 400 });
  }

  // ~11 m precision: nearby taps share a cache entry.
  const qLat = lat.toFixed(4);
  const qLng = lng.toFixed(4);

  try {
    const res = await fetch(
      `${NOMINATIM}?format=jsonv2&lat=${qLat}&lon=${qLng}&zoom=18&addressdetails=1&accept-language=en`,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 * 7 }, // a week — streets don't move
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) return NextResponse.json({ label: null });
    const data = (await res.json()) as NominatimResult;
    return NextResponse.json(
      { label: buildLabel(data) },
      { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ label: null });
  }
}
