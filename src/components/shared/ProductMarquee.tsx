"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Product } from "@/types";
import { formatUGX } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

interface Props {
  products: Product[];
  title: string;
  eyebrow?: string;
  accent?: "red" | "green" | "mustard";
  viewAllHref?: string;
}

/**
 * Auto-scrolling product strip — left-to-right motion.
 * The counter-direction partner to CategoryMarquee.
 */
const ProductMarquee: React.FC<Props> = ({
  products,
  title,
  eyebrow = "Trending Now",
  accent = "red",
  viewAllHref = "/shop",
}) => {
  const { addToCart } = useCart();
  if (!products.length) return null;

  const accentClass =
    accent === "green"   ? "text-brand-green" :
    accent === "mustard" ? "text-[var(--color-kafunda-mustard)]" :
                           "text-primary-red";

  // Duplicate so the loop is seamless
  const loop = [...products, ...products];

  return (
    <section className="py-16 md:py-20 bg-white border-y border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 md:mb-10">
        <div className="flex items-end justify-between">
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-2 ${accentClass}`}>
              {eyebrow}
            </p>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-kafunda-burgundy leading-none">
              {title}
            </h2>
          </div>
          <Link
            href={viewAllHref}
            className={`hidden md:flex items-center gap-1.5 ${accentClass} text-[11px] font-bold uppercase tracking-widest hover:underline`}
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Marquee — reversed direction, pauses on hover */}
      <div className="relative flex overflow-x-hidden marquee-paused">
        <div className="flex animate-marquee-reverse whitespace-nowrap py-4">
          {loop.map((product, idx) => (
            <div
              key={`${product.id}-${idx}`}
              className="mx-3 inline-flex w-50 shrink-0 flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow"
            >
              <Link href={`/product/${product.id}`} className="relative block aspect-square bg-gray-50">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  sizes="200px"
                  className="object-contain p-3"
                />
                {product.is_sale && (
                  <span className="absolute top-2 left-2 bg-kafunda-mustard text-kafunda-burgundy text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                    Sale
                  </span>
                )}
                {!product.in_stock && (
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1 rounded-full border border-gray-200 whitespace-nowrap">
                    Out of Stock
                  </span>
                )}
              </Link>
              <div className="p-3 flex flex-col">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">
                  {product.category.split(",")[0].trim()}
                </p>
                <Link
                  href={`/product/${product.id}`}
                  className="text-xs font-black text-zinc-900 leading-snug line-clamp-2 hover:text-primary-red transition-colors mb-2 whitespace-normal"
                >
                  {product.name}
                </Link>
                <p className="text-sm font-black text-kafunda-burgundy leading-none mb-2">
                  {formatUGX(product.price_ugx)}
                </p>
                <button
                  onClick={() => { if (product.in_stock) addToCart(product); }}
                  disabled={!product.in_stock}
                  className="w-full bg-kafunda-burgundy hover:bg-primary-red disabled:bg-gray-100 disabled:text-gray-400 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl transition-colors"
                >
                  {product.in_stock ? "Add to Cart" : "Unavailable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductMarquee;