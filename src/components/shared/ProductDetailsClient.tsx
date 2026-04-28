// src/components/shared/ProductDetailsClient.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Minus, Plus, ShoppingBag, ChevronDown, ChevronUp } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatUGX } from "@/lib/utils";
import ProductCard from "@/components/shared/ProductCard";
import StickyAddToCart from "@/components/shared/StickyAddToCart";
import { Product } from "@/types";

const RV_KEY = "kafunda_recently_viewed";

function trackPageView(product: Product) {
  try {
    const raw = localStorage.getItem(RV_KEY);
    const prev: Product[] = raw ? JSON.parse(raw) : [];
    const next = [product, ...prev.filter((p) => p.id !== product.id)].slice(0, 12);
    localStorage.setItem(RV_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

interface ProductDetailsProps {
    product: Product;
    relatedProducts: Product[];
}

export default function ProductDetailsClient({ product, relatedProducts }: ProductDetailsProps) {
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(product.image_url);
    const [openAccordion, setOpenAccordion] = useState<string | null>("description");
    const addToCartBtnRef = useRef<HTMLButtonElement>(null);

    // Track this product in Recently Viewed on full page load
    useEffect(() => {
        trackPageView(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.id]);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-8 overflow-x-auto whitespace-nowrap pb-2">
                <Link href="/" className="hover:text-black transition-colors">Home</Link>
                <ChevronRight className="h-3 w-3" />
                <Link href={`/shop?category=${product.category.split(',')[0]}`} className="hover:text-black transition-colors">
                    {product.category.split(',')[0]}
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-zinc-900 truncate max-w-50">{product.name}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
                {/* Left: Gallery */}
                <div className="space-y-4">
                    <div className="relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center p-12">
                        <Image
                            src={activeImage}
                            alt={product.name}
                            fill
                            className="object-contain p-8"
                            priority
                        />
                    </div>
                    {product.gallery_urls.length > 1 && (
                        <div className="grid grid-cols-4 gap-4">
                            {product.gallery_urls.map((url, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImage(url)}
                                    className={`relative aspect-square rounded-md overflow-hidden bg-gray-50 border-2 transition-all ${activeImage === url ? "border-primary-red" : "border-transparent hover:border-gray-200"
                                        }`}
                                >
                                    <Image
                                        src={url}
                                        alt={`${product.name} thumbnail ${idx + 1}`}
                                        fill
                                        className="object-contain p-2"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Buy Box */}
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                        {product.brand}
                    </span>
                    <h1 className="text-4xl font-black text-black mb-4 leading-tight uppercase tracking-tighter">
                        {product.name}
                    </h1>

                    <div className="flex items-center space-x-4 mb-6">
                        <span className="text-3xl font-black text-black">
                            {formatUGX(product.price_ugx)}
                        </span>
                        {product.in_stock && (
                            <span className="bg-emerald-50 text-success-green px-3 py-1 rounded-full text-xs font-bold flex items-center">
                                <span className="w-2 h-2 bg-success-green rounded-full mr-2 animate-pulse"></span>
                                In Stock
                            </span>
                        )}
                    </div>

                    <p className="text-zinc-600 leading-relaxed mb-8 font-medium">
                        {product.description}
                    </p>

                    <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-10">
                        {/* Quantity Selector */}
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden w-full sm:w-auto">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="p-4 hover:bg-gray-50 transition-colors"
                                aria-label="Decrease quantity"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-6 font-bold text-zinc-900 min-w-12.5 text-center">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="p-4 hover:bg-gray-50 transition-colors"
                                aria-label="Increase quantity"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                            ref={addToCartBtnRef}
                            onClick={() => addToCart(product, quantity)}
                            className="grow bg-primary-red hover:bg-primary-red-hover text-white py-4 px-8 font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center space-x-3 shadow-lg transform hover:scale-[1.02]"
                        >
                            <ShoppingBag className="h-5 w-5" />
                            <span>Add to Cart</span>
                        </button>
                    </div>

                    {/* Accordions */}
                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                        <AccordionItem
                            title="Description"
                            isOpen={openAccordion === "description"}
                            toggle={() => toggleAccordion("description")}
                        >
                            <p className="text-sm leading-relaxed text-zinc-600">
                                {product.description}
                            </p>
                        </AccordionItem>

                        <AccordionItem
                            title="Tasting Notes & ABV%"
                            isOpen={openAccordion === "tasting"}
                            toggle={() => toggleAccordion("tasting")}
                        >
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="font-bold text-zinc-900 uppercase tracking-widest text-[10px] mb-1">ABV%</p>
                                    <p className="text-zinc-600">{product.abv}</p>
                                </div>
                                <div>
                                    <p className="font-bold text-zinc-900 uppercase tracking-widest text-[10px] mb-1">Volume</p>
                                    <p className="text-zinc-600">{product.volume}</p>
                                </div>
                            </div>
                        </AccordionItem>

                        <AccordionItem
                            title="Shipping & Returns"
                            isOpen={openAccordion === "shipping"}
                            toggle={() => toggleAccordion("shipping")}
                        >
                            <p className="text-sm leading-relaxed text-zinc-600">
                                Free shipping on orders over UGX 500,000. Under normal circumstances,
                                deliveries within Kampala take 1-2 hours. Returns accepted within
                                24 hours if the seal is unbroken.
                            </p>
                        </AccordionItem>
                    </div>
                </div>
            </div>

            <StickyAddToCart product={product} quantity={quantity} triggerRef={addToCartBtnRef} />

            {/* Recommended — horizontal scroll carousel */}
            {relatedProducts.length > 0 && (
                <RelatedCarousel products={relatedProducts} />
            )}
        </div>
    );
}

function RelatedCarousel({ products }: { products: Product[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (dir: "left" | "right") => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
    };

    return (
        <section className="mt-20 pt-20 border-t border-gray-100">
            <div className="flex items-end justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
                    You May Also Like
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => scroll("left")}
                        className="p-2.5 rounded-full border-2 border-gray-200 hover:border-zinc-900 text-zinc-500 hover:text-zinc-900 transition-all"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => scroll("right")}
                        className="p-2.5 rounded-full border-2 border-gray-200 hover:border-zinc-900 text-zinc-500 hover:text-zinc-900 transition-all"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            >
                {products.map((p) => (
                    <div key={p.id} className="shrink-0 w-56 sm:w-64 snap-start">
                        <ProductCard product={p} />
                    </div>
                ))}
            </div>
        </section>
    );
}

const AccordionItem = ({ title, children, isOpen, toggle }: { title: string, children: React.ReactNode, isOpen: boolean, toggle: () => void }) => (
    <div className="py-4">
        <button
            onClick={toggle}
            className="w-full flex items-center justify-between text-left group"
        >
            <span className="font-bold text-zinc-900 uppercase tracking-widest text-xs group-hover:text-primary-red transition-colors">
                {title}
            </span>
            {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </button>
        {isOpen && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {children}
            </div>
        )}
    </div>
);