"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getCategoryStyle } from "@/lib/constants";
import type { WPCategory } from "@/lib/api";

interface Props {
  categories: WPCategory[];
}

const CategoryMarquee: React.FC<Props> = ({ categories }) => {
  if (!categories.length) return null;
  const loop = [...categories, ...categories];

  return (
    <section className="py-16 md:py-24 bg-kafunda-cream overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 md:mb-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold text-kafunda-burgundy uppercase tracking-[0.3em] mb-2">
              Curated Collections
            </p>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-kafunda-burgundy leading-none">
              Explore <span className="text-brand-green">Categories</span>
            </h2>
            <p className="text-sm text-kafunda-burgundy/60 mt-3 max-w-md font-medium leading-relaxed">
              From bold reds to crisp champagnes — find your moment.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden md:inline-flex items-center gap-1.5 text-kafunda-burgundy hover:text-primary-red text-[11px] font-bold uppercase tracking-widest transition-colors border-2 border-kafunda-burgundy/10 hover:border-primary-red px-5 py-2.5 rounded-full whitespace-nowrap"
          >
            All Products <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Marquee ──────────────────────────────────────────────────────── */}
      <div className="relative flex overflow-x-hidden marquee-paused">
        <div className="flex animate-marquee-slow whitespace-nowrap">
          {loop.map((cat, idx) => {
            const style = getCategoryStyle(cat.name);
            const hasImage = !!cat.image?.sourceUrl;

            return (
              <Link
                key={`${cat.id}-${idx}`}
                href={`/shop?category=${encodeURIComponent(cat.name)}`}
                className="group mx-2.5 md:mx-3 inline-block"
              >
                <div className="relative w-65 md:w-75 h-50 md:h-55 rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">

                  {hasImage ? (
                    <>
                      <Image
                        src={cat.image!.sourceUrl}
                        alt={cat.name}
                        fill
                        sizes="300px"
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        unoptimized
                      />
                      <div className={`${style.bg} absolute inset-0 mix-blend-multiply opacity-55 group-hover:opacity-25 transition-opacity duration-500`} />
                      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />
                    </>
                  ) : (
                    <div className={`${style.bg} absolute inset-0 flex items-center justify-center`}>
                      <span className="text-7xl opacity-90 transition-transform duration-500 group-hover:scale-110">
                        {style.icon}
                      </span>
                    </div>
                  )}

                  {/* Icon badge — anchors brand identity on every card */}
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-xl shadow-md">
                    {style.icon}
                  </div>

                  {/* Bottom content */}
                  <div className={`absolute inset-x-0 bottom-0 p-5 ${hasImage ? "text-white" : style.text}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 ${hasImage ? "text-white/70" : "opacity-60"}`}>
                      Shop
                    </p>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none mb-2 whitespace-normal">
                      {cat.name}
                    </h3>
                    <div className="flex items-center gap-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Browse
                      </span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Mobile View All ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 mt-8 flex md:hidden">
        <Link
          href="/shop"
          className="flex-1 flex items-center justify-center gap-2 border-2 border-kafunda-burgundy/20 rounded-full py-3 text-kafunda-burgundy text-xs font-bold uppercase tracking-widest"
        >
          View All Categories <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
};

export default CategoryMarquee;