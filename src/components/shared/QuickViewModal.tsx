"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag, Star, ArrowRight } from "lucide-react";
import { Product } from "@/types";
import { formatUGX } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

interface Props {
  product: Product | null;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: Props) {
  const { addToCart } = useCart();

  // Lock body scroll while open
  useEffect(() => {
    if (product) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {product && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel — bottom sheet on mobile, centred modal on desktop */}
          <motion.div
            key="panel"
            initial={{ y: "100%", opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-51 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto
                       md:inset-0 md:m-auto md:rounded-2xl md:max-w-3xl md:max-h-[85vh] md:h-fit"
          >
            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-zinc-600 transition-colors"
              aria-label="Close quick view"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Image */}
              <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-10 md:rounded-l-2xl overflow-hidden">
                {product.is_sale && (
                  <span className="absolute top-4 left-4 bg-primary-red text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-sm z-10">
                    Sale
                  </span>
                )}
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-contain p-8"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              </div>

              {/* Details */}
              <div className="px-6 py-6 md:py-8 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400 mb-1">
                  {product.brand}
                </p>
                <h2 className="text-xl md:text-2xl font-black text-zinc-900 leading-tight mb-3">
                  {product.name}
                </h2>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400">4.9 (48 reviews)</span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-2xl font-black text-zinc-900">
                    {formatUGX(product.price_ugx)}
                  </span>
                  {product.original_price_ugx && (
                    <span className="text-sm text-gray-400 line-through font-medium">
                      {formatUGX(product.original_price_ugx)}
                    </span>
                  )}
                </div>

                {/* Stock */}
                <div className="flex items-center gap-2 mb-5">
                  <span className={`w-2 h-2 rounded-full ${product.in_stock ? "bg-success-green animate-pulse" : "bg-gray-300"}`} />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    {product.in_stock ? "In Stock" : "Out of Stock"}
                  </span>
                  {product.stock_count && product.stock_count < 10 && (
                    <span className="text-[10px] font-bold text-primary-red uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded ml-1">
                      Only {product.stock_count} left
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-zinc-500 font-medium leading-relaxed mb-6 line-clamp-3">
                  {product.description}
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3 mt-auto">
                  <button
                    onClick={() => { addToCart(product); onClose(); }}
                    disabled={!product.in_stock}
                    className="flex items-center justify-center gap-2 bg-primary-red hover:bg-primary-red-hover disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors shadow-md"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <Link
                    href={`/product/${product.id}`}
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-zinc-900 text-zinc-700 hover:text-zinc-900 py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors"
                  >
                    View Full Details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
