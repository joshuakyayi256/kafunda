"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, X, ArrowRight } from "lucide-react";
import { formatUGX } from "@/lib/utils";
import type { Product } from "@/types";

const KEY = "kafunda_recently_viewed";

export default function RecentlyViewed() {
  const [items, setItems] = useState<Product[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        try { setItems(e.newValue ? JSON.parse(e.newValue) : []); } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const remove = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  if (!mounted || items.length === 0) return null;

  return (
    <section className="py-14 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-zinc-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Your History</p>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Recently Viewed</h2>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(KEY);
              setItems([]);
            }}
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>

        {/* Horizontal scroll row */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {items.map((product) => (
            <div
              key={product.id}
              className="group shrink-0 w-36 sm:w-44 relative"
            >
              {/* Remove button */}
              <button
                onClick={() => remove(product.id)}
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                aria-label="Remove"
              >
                <X className="h-3 w-3 text-zinc-500" />
              </button>

              <Link href={`/shop?search=${encodeURIComponent(product.name)}`} className="block">
                <div className="relative aspect-square rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden mb-3 group-hover:border-primary-red/30 transition-colors">
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 144px, 176px"
                  />
                  {product.is_sale && (
                    <span className="absolute top-2 left-2 bg-primary-red text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                      Sale
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-zinc-800 truncate leading-tight mb-1 group-hover:text-primary-red transition-colors">
                  {product.name}
                </p>
                <p className="text-xs font-black text-zinc-900">{formatUGX(product.price_ugx)}</p>
                {product.original_price_ugx && product.original_price_ugx > product.price_ugx && (
                  <p className="text-[10px] text-zinc-400 line-through">{formatUGX(product.original_price_ugx)}</p>
                )}
              </Link>
            </div>
          ))}

          {/* View shop CTA tile */}
          <Link
            href="/shop"
            className="shrink-0 w-36 sm:w-44 aspect-square rounded-2xl bg-zinc-950 flex flex-col items-center justify-center gap-3 text-white hover:bg-primary-red transition-colors group"
          >
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-center px-3">
              Browse All Products
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
