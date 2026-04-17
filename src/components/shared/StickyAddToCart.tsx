"use client";

import { useEffect, useState, RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { Product } from "@/types";
import { formatUGX } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

interface Props {
  product: Product;
  quantity: number;
  /** ref to the main "Add to Cart" button — when it goes off-screen, we appear */
  triggerRef: RefObject<HTMLButtonElement | null>;
}

export default function StickyAddToCart({ product, quantity, triggerRef }: Props) {
  const { addToCart } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (triggerRef.current) observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [triggerRef]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
            {/* Thumbnail */}
            <div className="relative w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0 hidden sm:block">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-contain p-1"
              />
            </div>

            {/* Name + price */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-zinc-900 truncate">{product.name}</p>
              <p className="text-sm font-black text-primary-red">{formatUGX(product.price_ugx)}</p>
            </div>

            {/* CTA */}
            <button
              onClick={() => addToCart(product, quantity)}
              className="flex items-center gap-2 bg-primary-red hover:bg-primary-red-hover text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors shrink-0 shadow-md"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Add to Cart</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
