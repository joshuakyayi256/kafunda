"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Eye } from "lucide-react";
import { Product } from "@/types";
import { formatUGX } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import QuickViewModal from "@/components/shared/QuickViewModal";

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const { addToCart } = useCart();
    const [quickViewOpen, setQuickViewOpen] = useState(false);

    // Generate a stable "random" review count based on the product ID
    const reviewCount = product.reviews ||
        ((product.id.charCodeAt(0) + product.id.charCodeAt(product.id.length - 1)) * 13) % 80 + 20;

    return (
        <>
            <div className="group bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col h-full relative border border-gray-100 hover:border-gray-200">
                {/* Badges */}
                <div className="absolute top-3 left-3 z-10 font-bold text-[10px] tracking-widest uppercase flex flex-col gap-1">
                    {product.is_sale && (
                        <span className="bg-primary-red text-white px-2.5 py-1 rounded-md shadow-sm">
                            Sale
                        </span>
                    )}
                    {product.in_stock && !product.is_sale && (
                        <span className="bg-success-green text-white px-2.5 py-1 rounded-md shadow-sm">
                            In Stock
                        </span>
                    )}
                </div>

                {/* Image Container */}
                <div className="relative aspect-3/4 overflow-hidden bg-gray-50 flex items-center justify-center p-8">
                    <Link href={`/product/${product.id}`} className="absolute inset-0" aria-label={product.name} />
                    <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-contain transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 250px"
                    />

                    {/* Quick View button — appears on hover */}
                    <button
                        onClick={() => setQuickViewOpen(true)}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-gray-200 text-zinc-700 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 shadow-md whitespace-nowrap z-10"
                        aria-label={`Quick view ${product.name}`}
                    >
                        <Eye className="h-3.5 w-3.5" />
                        Quick View
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col grow">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">
                        {product.brand}
                    </span>

                    {/* Rating */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center text-[10px] text-yellow-500 font-bold gap-1">
                            ★ {product.rating || "4.9"}
                            <span className="text-gray-400">({reviewCount})</span>
                        </div>
                        {product.stock_count && product.stock_count < 10 && (
                            <span className="text-[10px] font-bold text-primary-red uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded">
                                Only {product.stock_count} left!
                            </span>
                        )}
                    </div>

                    <Link href={`/product/${product.id}`} className="hover:text-primary-red transition-colors mb-3">
                        <h3 className="text-sm font-black leading-tight text-zinc-900 group-hover:underline underline-offset-4 decoration-current decoration-2">
                            {product.is_today_offer && product.description ? product.description : product.name}
                        </h3>
                    </Link>

                    {/* Price */}
                    <div className="mt-auto pt-2 flex items-baseline gap-2">
                        <span className="text-base font-black text-zinc-900">
                            {formatUGX(product.price_ugx)}
                        </span>
                        {product.original_price_ugx && (
                            <span className="text-xs text-gray-400 line-through font-medium">
                                {formatUGX(product.original_price_ugx)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Quick Add */}
                <button
                    onClick={() => addToCart(product)}
                    className="w-full bg-zinc-900 hover:bg-primary-red text-white py-3 font-bold text-xs tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                    aria-label={`Add ${product.name} to cart`}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Quick Add
                </button>
            </div>

            <QuickViewModal
                product={quickViewOpen ? product : null}
                onClose={() => setQuickViewOpen(false)}
            />
        </>
    );
};

export default ProductCard;
