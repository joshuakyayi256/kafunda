"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Eye, Check } from "lucide-react";
import { Product } from "@/types";
import { formatUGX } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import QuickViewModal from "@/components/shared/QuickViewModal";

const KEY = "kafunda_recently_viewed";

function trackView(product: Product) {
    try {
        const raw = localStorage.getItem(KEY);
        const prev: Product[] = raw ? JSON.parse(raw) : [];
        const next = [product, ...prev.filter((p) => p.id !== product.id)].slice(0, 12);
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch { /* ignore */ }
}

/**
 * Product card - refreshed (June 2026).
 * Less black: the heavy bottom "Add to Cart" bar is replaced by a green
 * circular + button that floats on the image (per the look the client liked),
 * with a brief check-tick confirmation on add. The card is white and light;
 * category, name, and price sit clean underneath. Sale tag uses crimson.
 */
const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const { addToCart } = useCart();
    const [quickViewOpen, setQuickViewOpen] = useState(false);
    const [justAdded, setJustAdded] = useState(false);

    const handleQuickView = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        trackView(product);
        setQuickViewOpen(true);
    }, [product]);

    const handleAdd = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!product.in_stock) return;
        addToCart(product);
        setJustAdded(true);
        window.setTimeout(() => setJustAdded(false), 1100);
    }, [product, addToCart]);

    const category = (product.category || "Uncategorized").split(",")[0].trim();

    return (
        <>
            <div className="group relative bg-white rounded-2xl overflow-hidden border border-kafunda-bone-soft hover:border-kafunda-green/30 hover:shadow-[0_12px_32px_rgba(27,122,67,0.10)] transition-all duration-300 flex flex-col">

                {/* Image */}
                <div className="relative aspect-square bg-white overflow-hidden">
                    <Link
                        href={`/product/${product.id}`}
                        className="absolute inset-0 z-10"
                        aria-label={product.name}
                        onClick={() => trackView(product)}
                    />

                    <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className={`object-contain p-4 transition-transform duration-500 group-hover:scale-105 ${!product.in_stock ? "opacity-40 grayscale" : ""}`}
                    />

                    {/* Sale badge (crimson accent only) */}
                    {product.is_sale && (
                        <span className="absolute top-3 left-3 z-20 bg-kafunda-crimson text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md shadow-sm">
                            Sale
                        </span>
                    )}

                    {/* Quick View - hover on desktop, tucked top-right */}
                    <button
                        onClick={handleQuickView}
                        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-kafunda-bone-soft flex items-center justify-center text-zinc-400 hover:text-kafunda-green active:scale-90 transition-all md:opacity-0 md:scale-90 md:group-hover:opacity-100 md:group-hover:scale-100"
                        aria-label={`Quick view ${product.name}`}
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </button>

                    {/* Out of stock label */}
                    {!product.in_stock && (
                        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center pb-3">
                            <span className="bg-white/90 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1 rounded-full border border-gray-200">
                                Out of Stock
                            </span>
                        </div>
                    )}

                    {/* Floating add button - the green +, bottom-right of the image */}
                    {product.in_stock && (
                        <button
                            onClick={handleAdd}
                            className={`absolute bottom-3 right-3 z-20 w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all duration-200 text-white ${
                                justAdded
                                    ? "bg-kafunda-green-deep"
                                    : "bg-kafunda-green hover:bg-kafunda-green-deep"
                            }`}
                            aria-label={justAdded ? `${product.name} added` : `Add ${product.name} to cart`}
                        >
                            {justAdded
                                ? <Check className="h-5 w-5" strokeWidth={3} />
                                : <Plus className="h-5 w-5" strokeWidth={2.5} />}
                        </button>
                    )}
                </div>

                {/* Info */}
                <div className="px-3.5 pt-3 pb-4 flex flex-col grow">
                    <p className="text-[9px] font-bold text-kafunda-green uppercase tracking-widest mb-1 truncate">
                        {category}
                    </p>

                    <Link
                        href={`/product/${product.id}`}
                        onClick={() => trackView(product)}
                        className="mb-2"
                    >
                        <h3 className="text-xs font-bold text-zinc-900 leading-snug line-clamp-2 hover:text-kafunda-green transition-colors">
                            {product.name}
                        </h3>
                    </Link>

                    <div className="mt-auto flex items-end justify-between gap-1">
                        <div>
                            <p className="text-sm font-black text-zinc-900 leading-none">
                                {formatUGX(product.price_ugx)}
                            </p>
                            {product.original_price_ugx && (
                                <p className="text-[10px] text-gray-400 line-through mt-0.5">
                                    {formatUGX(product.original_price_ugx)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <QuickViewModal
                product={quickViewOpen ? product : null}
                onClose={() => setQuickViewOpen(false)}
            />
        </>
    );
};

export default ProductCard;