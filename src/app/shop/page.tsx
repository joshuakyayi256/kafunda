"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/shared/ProductCard";
import products from "@/data/products.json";

const categories = ["All", "Wines", "Whisky", "Gin", "Beers", "Tequila", "Champagne", "Cognac", "Vodka", "Rum", "Liqueur"];

const ShopContent = () => {
    const searchParams = useSearchParams();
    const [activeCategory, setActiveCategory] = useState("All");
    const [activeBrand, setActiveBrand] = useState<string | null>(null);
    const [showOnlyOffers, setShowOnlyOffers] = useState(false);

    useEffect(() => {
        const cat = searchParams.get("category");
        const filter = searchParams.get("filter");
        const brand = searchParams.get("brand");

        if (cat && categories.includes(cat)) {
            setActiveCategory(cat);
        } else {
            setActiveCategory("All");
        }

        setActiveBrand(brand);
        setShowOnlyOffers(filter === "offers");
    }, [searchParams]);

    let filteredProducts = activeCategory === "All"
        ? products
        : products.filter(p => p.category === activeCategory);

    if (activeBrand) {
        filteredProducts = filteredProducts.filter(p => p.brand.toLowerCase() === activeBrand.toLowerCase() || p.brand.includes(activeBrand));
    }

    if (showOnlyOffers) {
        filteredProducts = filteredProducts.filter(p => p.is_sale);
    }

    return (
        <div className="bg-white min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-gray-100 pb-8">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Our Collection</h1>
                        <p className="text-zinc-500 max-w-2xl font-medium">
                            Browse through our handpicked selection of premium spirits and fine wines.
                            From rare vintages to everyday favorites, we bring the best of the world to your doorstep.
                        </p>
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-12 pb-4 overflow-x-auto no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border-2 ${activeCategory === cat
                                ? "bg-black border-black text-white"
                                : "bg-transparent border-gray-100 text-gray-400 hover:border-gray-200 hover:text-black"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                    {filteredProducts.map((product: any) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-gray-400 font-medium">No products found in this category.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ShopPage = () => {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center font-bold uppercase tracking-widest text-gray-400">Loading Collection...</div>}>
            <ShopContent />
        </Suspense>
    );
};

export default ShopPage;
