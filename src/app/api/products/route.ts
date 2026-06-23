/**
 * /api/products — returns the full catalogue for client components.
 * ------------------------------------------------------------------
 * Rides getAllProducts() (the cached, tagged fetch) exactly like /api/search,
 * so it never hits WordPress live and survives WAF/SSL blips. Used by client
 * widgets that need the catalogue (e.g. CompleteYourOrder bundle suggestions).
 *
 * Returns a TRIMMED product shape — only the fields the widgets need — to keep
 * the payload small.
 */

import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/api";
import type { Product } from "@/types";

export async function GET() {
  let products: Product[];
  try {
    products = await getAllProducts();
  } catch (err) {
    console.error("[api/products] Catalogue unavailable:", err);
    return NextResponse.json({ products: [] });
  }

  // Trim to the fields client widgets actually use.
  const trimmed = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    brand: p.brand,
    price_ugx: p.price_ugx,
    original_price_ugx: p.original_price_ugx,
    image_url: p.image_url,
    in_stock: p.in_stock,
    is_sale: p.is_sale,
    volume: p.volume,
    description: p.description,
  }));

  return NextResponse.json(
    { products: trimmed },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
  );
}