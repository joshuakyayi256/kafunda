"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import { Product } from "@/types";

/**
 * Homepage picks as a GRID (not a sideways carousel): on phones a 2-column
 * grid shows 4–6 products without any swiping, which is where most ad clicks
 * land. Each visitor gets a fresh random selection from the pool, so returning
 * customers keep seeing different bottles.
 */
export default function DealsGrid({
  pool,
  count = 8,
  title,
  eyebrow,
  note,
  href,
}: {
  pool: Product[];
  count?: number;
  title: React.ReactNode;
  eyebrow: string;
  note?: string;
  href: string;
}) {
  const [items, setItems] = useState<Product[]>(() => pool.slice(0, count));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Deferred so server HTML and the first client render match, then shuffle.
    const t = setTimeout(() => {
      const copy = [...pool];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setItems(copy.slice(0, count));
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, [pool, count]);

  if (pool.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-3 py-6 sm:px-6 md:py-10 lg:px-8">
      <div className="mb-4 flex items-end justify-between gap-3 md:mb-6">
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-kafunda-crimson">{eyebrow}</p>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-kafunda-ink md:text-4xl">{title}</h2>
          {note && <p className="mt-1 text-xs text-zinc-500 md:text-sm">{note}</p>}
        </div>
        <Link href={href} className="hidden shrink-0 items-center text-xs font-bold uppercase tracking-widest text-primary-red hover:underline sm:flex">
          View all <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </div>

      <div className={`grid grid-cols-2 gap-2 transition-opacity duration-500 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 ${ready ? "opacity-100" : "opacity-0"}`}>
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <Link
        href={href}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border-2 border-kafunda-ink bg-white py-3.5 text-xs font-black uppercase tracking-widest text-kafunda-ink transition-colors hover:bg-kafunda-ink hover:text-white sm:mx-auto sm:w-80"
      >
        Shop all products <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
