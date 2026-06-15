"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import { Product } from "@/types";

/**
 * Reusable product shelf: section heading + HORIZONTALLY SCROLLING product row.
 *
 * - Mobile: swipe sideways (no buttons needed - touch is natural).
 * - Desktop: left/right arrow buttons (hidden on mobile) scroll the row, since
 *   mouse users have no obvious sideways-scroll affordance.
 *
 * Cards are equal height (items-stretch + flex wrapper + h-full card) and fixed
 * width, so the row overflows and scrolls instead of wrapping.
 *
 * textured -> transparent so the site-wide body texture shows through.
 */
interface CategoryShelfProps {
  title: string;
  accentWord?: string;
  eyebrow?: string;
  products: Product[];
  viewAllHref: string;
  limit?: number;
  textured?: boolean;
}

export default function CategoryShelf({
  title,
  accentWord,
  eyebrow,
  products,
  viewAllHref,
  limit = 12,
  textured = false,
}: CategoryShelfProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  if (!products || products.length === 0) return null;

  const items = products.slice(0, limit);

  // Scroll by roughly one "page" of the visible row width.
  const scrollByAmount = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 240);
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  // Split the title around the accent word so it can be coloured.
  let before = title;
  let accent = "";
  let after = "";
  if (accentWord && title.includes(accentWord)) {
    const idx = title.indexOf(accentWord);
    before = title.slice(0, idx);
    accent = accentWord;
    after = title.slice(idx + accentWord.length);
  }

  return (
    <section className={`py-10 md:py-12 ${textured ? "bg-transparent" : "bg-white"} border-t border-kafunda-bone-soft`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-6 md:mb-8">
          <div>
            {eyebrow && (
              <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-1.5">
                {eyebrow}
              </p>
            )}
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-kafunda-ink">
              {before}
              {accent && <span className="text-primary-red">{accent}</span>}
              {after}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Desktop scroll buttons - hidden on mobile (md:flex) */}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollByAmount("left")}
                aria-label={`Scroll ${title} left`}
                className="w-9 h-9 rounded-full border border-kafunda-bone-soft bg-white text-kafunda-ink flex items-center justify-center hover:border-kafunda-green hover:text-kafunda-green active:scale-90 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByAmount("right")}
                aria-label={`Scroll ${title} right`}
                className="w-9 h-9 rounded-full border border-kafunda-bone-soft bg-white text-kafunda-ink flex items-center justify-center hover:border-kafunda-green hover:text-kafunda-green active:scale-90 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <Link
              href={viewAllHref}
              className="text-primary-red font-bold uppercase tracking-widest text-[10px] md:text-xs hover:underline flex items-center"
            >
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </div>

        {/*
          Horizontal scroll row.
          - flex items-stretch -> equal-height cards
          - overflow-x-auto, snap -> sideways scroll/swipe with snap
          - scrollbar hidden (see globals.css)
          - negative margin + padding -> cards peek to the screen edge on mobile
        */}
        <div
          ref={scrollRef}
          className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 flex w-[150px] sm:w-[200px] lg:w-[230px]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}