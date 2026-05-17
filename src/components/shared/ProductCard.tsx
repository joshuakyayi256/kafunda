"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Eye } from "lucide-react";
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

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const { addToCart } = useCart();
    const [quickViewOpen, setQuickViewOpen] = useState(false);

    const handleQuickView = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        trackView(product);
        setQuickViewOpen(true);
    }, [product]);

    return (
        <>
            <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 flex flex-col">

                {/* Image */}
                <div className="relative aspect-square bg-gray-50 overflow-hidden">
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
                        className={`object-contain p-3 transition-transform duration-500 group-hover:scale-105 ${!product.in_stock ? "opacity-40 grayscale" : ""}`}
                    />

                    {/* Sale badge */}
                    {product.is_sale && (
                        <span className="absolute top-2.5 left-2.5 z-20 bg-primary-red text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md shadow-sm">
                            Sale
                        </span>
                    )}

                    {/* Out of stock label */}
                    {!product.in_stock && (
                        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center pb-3">
                            <span className="bg-white/90 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1 rounded-full border border-gray-200">
                                Out of Stock
                            </span>
                        </div>
                    )}

                    {/* Quick View — always visible on mobile, hover-only on desktop */}
                    <button
                        onClick={handleQuickView}
                        className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 active:scale-90 transition-all md:opacity-0 md:scale-90 md:group-hover:opacity-100 md:group-hover:scale-100"
                        aria-label={`Quick view ${product.name}`}
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Info */}
                <div className="px-3 pt-2.5 pb-2 flex flex-col grow">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">
                        {product.category.split(",")[0].trim()}
                    </p>

                    <Link
                        href={`/product/${product.id}`}
                        onClick={() => trackView(product)}
                        className="mb-2"
                    >
                        <h3 className="text-xs font-black text-zinc-900 leading-snug line-clamp-2 hover:text-primary-red transition-colors">
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

                {/* Add to Cart */}
                <div className="px-3 pb-3">
                    <button
                        onClick={() => { if (product.in_stock) addToCart(product); }}
                        disabled={!product.in_stock}
                        className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-primary-red disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-colors"
                        aria-label={`Add ${product.name} to cart`}
                    >
                        <Plus className="h-3 w-3 shrink-0" />
                        {product.in_stock ? "Add to Cart" : "Unavailable"}
                    </button>
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
