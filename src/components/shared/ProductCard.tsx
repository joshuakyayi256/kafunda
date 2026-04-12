"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Product } from "@/types";
import { formatUGX } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const { addToCart } = useCart();

    // Generate a stable "random" review count based on the product ID to keep the render pure
    const reviewCount = product.reviews || 
        ((product.id.charCodeAt(0) + product.id.charCodeAt(product.id.length - 1)) * 13) % 80 + 20;

    return (
        <div className="group bg-white rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col h-full relative border-0">
            {/* Badges */}
            <div className="absolute top-4 left-4 z-10 font-bold text-[10px] tracking-widest uppercase">
                {product.is_sale && (
                    <span className="bg-primary-red text-white px-3 py-1 rounded-sm mr-2 shadow-sm">
                        Sale
                    </span>
                )}
                {product.in_stock && !product.is_sale && (
                    <span className="bg-success-green text-white px-3 py-1 rounded-sm shadow-sm">
                        In Stock
                    </span>
                )}
            </div>

            {/* Image Container */}
            <Link href={`/product/${product.id}`} className="relative aspect-3/4 overflow-hidden bg-gray-50 flex items-center justify-center p-8">
                <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-contain transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 250px"
                />
            </Link>

            {/* Content */}
            <div className="p-5 flex flex-col grow">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">
                    {product.brand}
                </span>

                {/* Social Proof & Urgency */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-[10px] text-yellow-500 font-bold">
                        ★ {product.rating || "4.9"} <span className="text-gray-400 ml-1">({reviewCount})</span>
                    </div>
                    {product.stock_count && product.stock_count < 10 && (
                        <span className="text-[10px] font-bold text-primary-red uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded">
                            Only {product.stock_count} left!
                        </span>
                    )}
                </div>

                <Link href={`/product/${product.id}`} className="hover:text-primary-red transition-colors mb-3">
                    {/* REMOVED line-clamp-2 and min-h-12 here so the text can breathe! */}
                    <h3 className="text-base font-black leading-tight text-zinc-900 group-hover:underline underline-offset-4 decoration-current decoration-2">
                        {product.is_today_offer && product.description ? product.description : product.name}
                    </h3>
                </Link>
                
                {/* mt-auto ensures the price always sits at the bottom, even if the title above it is 4 lines long */}
                <div className="mt-auto pt-2 flex items-baseline space-x-2">
                    <span className="text-lg font-black text-black">
                        {formatUGX(product.price_ugx)}
                    </span>
                    {product.original_price_ugx && (
                        <span className="text-sm text-gray-400 line-through">
                            {formatUGX(product.original_price_ugx)}
                        </span>
                    )}
                </div>
            </div>

            {/* Quick Add Button */}
            <button
                onClick={() => addToCart(product)}
                className="w-full bg-primary-red hover:bg-primary-red-hover text-white py-3 font-bold text-sm tracking-widest uppercase transition-colors flex items-center justify-center space-x-2"
                aria-label={`Add ${product.name} to cart`}
            >
                <Plus className="h-4 w-4" />
                <span>Quick Add</span>
            </button>
        </div>
    );
};

export default ProductCard;