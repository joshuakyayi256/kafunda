"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import type { Product } from "@/types";

const KEY = "kafunda_recently_viewed";

/**
 * RecommendedForYou — "smart" personalization WITHOUT any AI.
 *
 * Self-fetching: pulls the catalogue from /api/products (cached), so drop it in
 * with NO props:  <RecommendedForYou />
 *
 * Reads recently-viewed categories (kafunda_recently_viewed, written by
 * ProductCard) and surfaces OTHER in-stock products from those categories.
 * Renders nothing until there's both history AND matches.
 *
 * NOTE: no `mounted` setState in the effect (avoids react-hooks/
 * set-state-in-effect). We simply only set `recommended` once we have picks;
 * before that the component returns null on its own.
 */
export default function RecommendedForYou({ limit = 12 }: { limit?: number }) {
  const [recommended, setRecommended] = useState<Product[]>([]);

  useEffect(() => {
    let viewed: Product[] = [];
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) viewed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!Array.isArray(viewed) || viewed.length === 0) return;

    const viewedCategories = new Set(
      viewed
        .map((v) => (v.category || "").split(",")[0].trim().toLowerCase())
        .filter(Boolean)
    );
    const viewedIds = new Set(viewed.map((v) => v.id));

    let cancelled = false;
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data?.products)) return;
        const picks = (data.products as Product[])
          .filter((p) => {
            const cat = (p.category || "").split(",")[0].trim().toLowerCase();
            return viewedCategories.has(cat) && !viewedIds.has(p.id) && p.in_stock;
          })
          .slice(0, limit);
        if (picks.length > 0) setRecommended(picks);
      })
      .catch(() => { /* silent */ });

    return () => { cancelled = true; };
  }, [limit]);

  if (recommended.length === 0) return null;

  return (
    <section className="py-10 md:py-12 bg-white border-t border-kafunda-bone-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-kafunda-green-tint flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-kafunda-green" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-kafunda-green uppercase tracking-[0.3em]">
                Picked For You
              </p>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-kafunda-ink">
                Recommended
              </h2>
            </div>
          </div>
        </div>

        <div
          className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {recommended.map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 flex w-37.5 sm:w-50 lg:w-57.5"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}