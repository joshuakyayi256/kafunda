/**
 * /api/search — Lightweight product suggestions for the navbar
 * ------------------------------------------------------------
 * GET /api/search?q=jam  →  { results: [{ id, name, category, price_ugx,
 *                                          image_url, is_sale }] }
 *
 * Rides getAllProducts(), which is served from the 1-hour tagged fetch cache
 * (busted by the /api/revalidate webhook) — so suggestion keystrokes NEVER
 * hit WordPress live. Same availability architecture as the catalogue:
 * browsing never touches Woo; only payment does. WAF outages therefore
 * can't break search either (and in dev, the fallback catalogue serves it).
 *
 * Matching: case-insensitive, scored — name prefix > word prefix >
 * substring > category match — with a small in-stock boost. Top 6 returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/lib/api";
import type { Product } from "@/types";

const MAX_RESULTS = 6;

interface Suggestion {
  id: string;
  name: string;
  category: string;
  price_ugx: number;
  image_url: string;
  is_sale: boolean;
}

function scoreProduct(p: Product, q: string): number {
  const name = p.name.toLowerCase();
  const category = p.category.toLowerCase();

  let s = 0;
  if (name.startsWith(q)) s = 100;
  else if (name.split(/\s+/).some((w) => w.startsWith(q))) s = 80;
  else if (name.includes(q)) s = 60;
  else if (category.includes(q)) s = 40;

  if (s > 0 && p.in_stock) s += 5;
  return s;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q") || "";
  const q = raw.trim().toLowerCase().slice(0, 60);

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  let products: Product[];
  try {
    products = await getAllProducts(); // cached — no live Woo hit per keystroke
  } catch (err) {
    console.error("[search] Catalogue unavailable:", err);
    return NextResponse.json({ results: [] });
  }

  const results: Suggestion[] = products
    .map((p) => ({ p, s: scoreProduct(p, q) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_RESULTS)
    .map(({ p }) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price_ugx: p.price_ugx,
      image_url: p.image_url,
      is_sale: p.is_sale,
    }));

  return NextResponse.json(
    { results },
    // Let the browser/edge hold a result briefly — typers often backtrack.
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=120" } }
  );
}