/**
 * /api/search — Lightweight product suggestions for the navbar (now "smart").
 * ------------------------------------------------------------
 * GET /api/search?q=jam  →  { results: [{ id, name, category, price_ugx,
 *                                          image_url, is_sale }] }
 *
 * Now uses the shared smartSearch() helper (src/lib/search-intent.ts) so navbar
 * suggestions understand natural language ("smooth whisky", "bubbly", "cheap
 * gin") exactly like the /shop results page. No AI/API — pure synonym+intent
 * maps over the cached catalogue, so keystrokes still never hit WordPress.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/lib/api";
import type { Product } from "@/types";
import { smartSearch } from "@/lib/search-intent";

const MAX_RESULTS = 6;

interface Suggestion {
  id: string;
  name: string;
  category: string;
  price_ugx: number;
  image_url: string;
  is_sale: boolean;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q") || "";
  const q = raw.trim().slice(0, 60);

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

  const results: Suggestion[] = smartSearch(products, q)
    .slice(0, MAX_RESULTS)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price_ugx: p.price_ugx,
      image_url: p.image_url,
      is_sale: p.is_sale,
    }));

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=120" } }
  );
}