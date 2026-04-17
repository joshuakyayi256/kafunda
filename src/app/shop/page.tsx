import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import ShopFilters from "@/components/shared/ShopFilters";
import { getAllProducts, getCategories } from "@/lib/api";
import { Product } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop All Products",
  description:
    "Browse Kafunda's full collection of 500+ premium wines, whiskies, gins, tequilas, and spirits. Fast delivery across Kampala.",
  openGraph: {
    title: "Shop All Products | Kafunda Wines & Spirits",
    description:
      "Browse 500+ premium wines, whiskies, gins, tequilas, and spirits. Fast delivery across Kampala.",
  },
};

export default async function ShopPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;

    // Extract query parameters
    const currentCategory = typeof params.category === 'string' ? params.category : "All";
    const currentBrand    = typeof params.brand    === 'string' ? params.brand    : null;
    const currentFilter   = typeof params.filter   === 'string' ? params.filter   : null;
    const currentSearch   = typeof params.search   === 'string' ? params.search   : null;
    const currentInStock  = params.inStock === "true";
    const currentMinPrice = typeof params.minPrice === 'string' ? Number(params.minPrice) : null;
    const currentMaxPrice = typeof params.maxPrice === 'string' ? Number(params.maxPrice) : null;

    const currentPage   = typeof params.page === 'string' ? parseInt(params.page) : 1;
    const ITEMS_PER_PAGE = 24;

    const [allProducts, wpCategories] = await Promise.all([
        getAllProducts(),
        getCategories(),
    ]);
    const safeProducts   = allProducts   || [];
    const safeCategories = wpCategories  || [];

    const dynamicCategories = ["All", ...safeCategories.map((c) => c.name)];

    // Apply all filters server-side
    let filteredProducts = currentCategory === "All"
        ? safeProducts
        : safeProducts.filter(p => p.category.toLowerCase().includes(currentCategory.toLowerCase()));

    if (currentBrand) {
        filteredProducts = filteredProducts.filter(p =>
            p.brand.toLowerCase().includes(currentBrand.toLowerCase())
        );
    }
    if (currentFilter === "offers") {
        filteredProducts = filteredProducts.filter(p => p.is_sale);
    }
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filteredProducts = filteredProducts.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    }
    if (currentInStock) {
        filteredProducts = filteredProducts.filter(p => p.in_stock);
    }
    if (currentMinPrice !== null) {
        filteredProducts = filteredProducts.filter(p => p.price_ugx >= currentMinPrice);
    }
    if (currentMaxPrice !== null) {
        filteredProducts = filteredProducts.filter(p => p.price_ugx <= currentMaxPrice);
    }

    const totalProducts  = filteredProducts.length;
    const totalPages     = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const buildPageUrl = (pageNumber: number) => {
        const query = new URLSearchParams();
        if (currentCategory !== "All") query.set("category", currentCategory);
        if (currentBrand)              query.set("brand", currentBrand);
        if (currentFilter)             query.set("filter", currentFilter);
        if (currentSearch)             query.set("search", currentSearch);
        if (currentInStock)            query.set("inStock", "true");
        if (currentMinPrice !== null)  query.set("minPrice", String(currentMinPrice));
        if (currentMaxPrice !== null)  query.set("maxPrice", String(currentMaxPrice));
        query.set("page", pageNumber.toString());
        return `/shop?${query.toString()}`;
    };

    const pageTitle = currentSearch
        ? `Results for "${currentSearch}"`
        : currentFilter === "offers"
        ? "Special Offers"
        : currentCategory !== "All"
        ? currentCategory
        : "Our Collection";

    return (
        <div className="bg-white min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Page header */}
                <div className="mb-8 pb-6 border-b border-gray-100">
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">
                        {pageTitle}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {totalProducts} products
                        </p>
                        {currentBrand && (
                            <span className="text-xs font-bold text-primary-red uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full">
                                Brand: {currentBrand}
                            </span>
                        )}
                        {currentSearch && (
                            <Link href="/shop" className="text-xs font-bold text-primary-red uppercase tracking-widest hover:underline">
                                ✕ Clear search
                            </Link>
                        )}
                    </div>
                </div>

                {/* Mobile filter trigger + main layout */}
                <div className="flex gap-10">

                    {/* Sidebar (desktop) / Drawer trigger (mobile) */}
                    <ShopFilters
                        categories={dynamicCategories}
                        currentCategory={currentCategory}
                        currentFilter={currentFilter}
                        currentSearch={currentSearch}
                        totalProducts={totalProducts}
                    />

                    {/* Right: category pills + grid */}
                    <div className="flex-1 min-w-0">
                        {/* Category pill tabs */}
                        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                            {dynamicCategories.map((cat) => {
                                const isActive = currentCategory.toLowerCase() === cat.toLowerCase();
                                const href = cat === "All"
                                    ? `/shop${currentFilter === 'offers' ? '?filter=offers' : ''}`
                                    : `/shop?category=${cat}${currentFilter === 'offers' ? '&filter=offers' : ''}`;
                                return (
                                    <Link
                                        key={cat}
                                        href={href}
                                        className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all border-2 shrink-0 ${
                                            isActive
                                            ? "bg-zinc-900 border-zinc-900 text-white"
                                            : "bg-transparent border-gray-100 text-gray-400 hover:border-gray-300 hover:text-zinc-700"
                                        }`}
                                    >
                                        {cat}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Product Grid */}
                        {paginatedProducts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-12">
                                    {paginatedProducts.map((product: Product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-4 border-t border-gray-100 pt-8">
                                        {currentPage > 1 ? (
                                            <Link
                                                href={buildPageUrl(currentPage - 1)}
                                                className="flex items-center px-5 py-2.5 border-2 border-gray-200 rounded-full text-xs font-bold uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 transition-colors"
                                            >
                                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                            </Link>
                                        ) : (
                                            <div className="flex items-center px-5 py-2.5 border-2 border-gray-100 text-gray-300 rounded-full text-xs font-bold uppercase tracking-widest cursor-not-allowed">
                                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                            </div>
                                        )}

                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            {currentPage} / {totalPages}
                                        </span>

                                        {currentPage < totalPages ? (
                                            <Link
                                                href={buildPageUrl(currentPage + 1)}
                                                className="flex items-center px-5 py-2.5 border-2 border-gray-200 rounded-full text-xs font-bold uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 transition-colors"
                                            >
                                                Next <ChevronRight className="h-4 w-4 ml-1" />
                                            </Link>
                                        ) : (
                                            <div className="flex items-center px-5 py-2.5 border-2 border-gray-100 text-gray-300 rounded-full text-xs font-bold uppercase tracking-widest cursor-not-allowed">
                                                Next <ChevronRight className="h-4 w-4 ml-1" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-24 text-center bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-gray-400 font-bold uppercase tracking-widest mb-2 text-sm">
                                    No products found
                                </p>
                                <p className="text-sm text-zinc-500 mb-6">
                                    We couldn&apos;t find any items matching your current filters.
                                </p>
                                <Link
                                    href="/shop"
                                    className="text-primary-red font-bold text-xs uppercase tracking-widest hover:underline"
                                >
                                    Clear all filters
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
