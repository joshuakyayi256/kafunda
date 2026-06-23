"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, PackagePlus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatUGX } from "@/lib/utils";
import type { Product } from "@/types";

/**
 * CompleteYourOrder — "frequently bought together" add-ons WITHOUT any AI.
 *
 * Self-fetching: pulls the catalogue from /api/products (cached, no live Woo
 * hit) so it can be dropped in with NO props:  <CompleteYourOrder />
 *
 * Looks at the categories in the cart and suggests complementary products from
 * a curated map (wines -> openers/ice/glasses, spirits -> mixers/cups, etc.),
 * matched against real catalogue products, excluding items already in the cart.
 * Renders nothing if there's nothing relevant to suggest.
 */

const BUNDLE_MAP: { match: string[]; suggest: string[] }[] = [
  { match: ["wine", "champagne", "sparkling", "prosecco"], suggest: ["opener", "glass", "ice", "napkin"] },
  { match: ["whisky", "bourbon", "scotch", "cognac", "brandy"], suggest: ["ice", "glass", "soda", "water"] },
  { match: ["gin", "vodka", "rum", "tequila"], suggest: ["tonic", "mixer", "soda", "juice", "ice"] },
  { match: ["beer", "cider"], suggest: ["cup", "ice", "snack", "chocolate"] },
];

const MAX_SUGGESTIONS = 4;

export default function CompleteYourOrder() {
  const { cart, addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.products)) setProducts(data.products);
      })
      .catch(() => { /* silent — widget just won't render */ });
    return () => { cancelled = true; };
  }, []);

  const suggestions = useMemo(() => {
    if (!cart.length || !products.length) return [];

    const cartIds = new Set(cart.map((c) => c.id));
    const cartCats = cart.map((c) => (c.category || "").toLowerCase());

    const wanted = new Set<string>();
    for (const { match, suggest } of BUNDLE_MAP) {
      if (cartCats.some((cat) => match.some((m) => cat.includes(m)))) {
        suggest.forEach((s) => wanted.add(s));
      }
    }
    if (wanted.size === 0) return [];

    const picks: Product[] = [];
    for (const p of products) {
      if (cartIds.has(p.id) || !p.in_stock) continue;
      const hay = `${p.name} ${p.category}`.toLowerCase();
      if ([...wanted].some((w) => hay.includes(w))) {
        picks.push(p);
        if (picks.length >= MAX_SUGGESTIONS) break;
      }
    }
    return picks;
  }, [cart, products]);

  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <PackagePlus className="h-4 w-4 text-primary-red" />
        <h3 className="text-sm font-black uppercase tracking-wide text-zinc-900">
          Complete your order
        </h3>
      </div>

      <div className="space-y-3">
        {suggestions.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <div className="relative w-12 h-12 shrink-0 rounded-lg bg-gray-50 overflow-hidden border border-gray-100">
              <Image src={p.image_url} alt={p.name} fill sizes="48px" className="object-contain p-1" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-900 truncate">{p.name}</p>
              <p className="text-xs font-black text-zinc-900">{formatUGX(p.price_ugx)}</p>
            </div>
            <button
              type="button"
              onClick={() => addToCart(p)}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary-red hover:bg-black text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 active:scale-95 transition-all"
              aria-label={`Add ${p.name} to cart`}
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}