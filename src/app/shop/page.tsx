import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import { getAllProducts, getCategories } from "@/lib/api";
import { Product } from "@/types";

export default async function ShopPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    
    // Extract query parameters
    const currentCategory = typeof params.category === 'string' ? params.category : "All";
    const currentBrand = typeof params.brand === 'string' ? params.brand : null;
    const currentFilter = typeof params.filter === 'string' ? params.filter : null;
    
    // Set up Pagination
    const currentPage = typeof params.page === 'string' ? parseInt(params.page) : 1;
    const ITEMS_PER_PAGE = 24;

    // Fetch live products AND live categories from WordPress
    const allProducts = await getAllProducts() || [];
    const wpCategories = await getCategories() || [];
    
    // Extract just the names and add "All" to the beginning
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dynamicCategories = ["All", ...wpCategories.map((c: any) => c.name)];

    // Apply Filters on the Server
    let filteredProducts = currentCategory === "All"
        ? allProducts
        : allProducts.filter(p => p.category.toLowerCase().includes(currentCategory.toLowerCase()));

    if (currentBrand) {
        filteredProducts = filteredProducts.filter(p => 
            p.brand.toLowerCase() === currentBrand.toLowerCase() || 
            p.brand.toLowerCase().includes(currentBrand.toLowerCase())
        );
    }

    if (currentFilter === "offers") {
        filteredProducts = filteredProducts.filter(p => p.is_sale);
    }

    // Calculate Pagination Data
    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    
    // Slice the array to get only the products for the current page
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Helper function to build pagination URLs without losing current filters
    const buildPageUrl = (pageNumber: number) => {
        const query = new URLSearchParams();
        if (currentCategory !== "All") query.set("category", currentCategory);
        if (currentBrand) query.set("brand", currentBrand);
        if (currentFilter) query.set("filter", currentFilter);
        query.set("page", pageNumber.toString());
        return `/shop?${query.toString()}`;
    };

    return (
        <div className="bg-white min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-gray-100 pb-8">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">
                            {currentFilter === "offers" ? "Special Offers" : "Our Collection"}
                        </h1>
                        <p className="text-zinc-500 max-w-2xl font-medium">
                            Browse through our handpicked selection of premium spirits and fine wines.
                            From rare vintages to everyday favorites, we bring the best of the world to your doorstep.
                        </p>
                        <div className="flex items-center space-x-4 mt-4">
                            {currentBrand && (
                                <p className="text-sm font-bold text-primary-red uppercase tracking-widest">
                                    Brand: {currentBrand}
                                </p>
                            )}
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Showing {paginatedProducts.length} of {totalProducts} results
                            </p>
                        </div>
                    </div>
                </div>

                {/* Dynamic Category Filter */}
                <div className="flex flex-wrap gap-2 mb-12 pb-4 overflow-x-auto no-scrollbar">
                    {dynamicCategories.map((cat) => {
                        const isActive = currentCategory.toLowerCase() === cat.toLowerCase();
                        const href = cat === "All" 
                            ? `/shop${currentFilter === 'offers' ? '?filter=offers' : ''}` 
                            : `/shop?category=${cat}${currentFilter === 'offers' ? '&filter=offers' : ''}`;

                        return (
                            <Link
                                key={cat}
                                href={href}
                                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border-2 shrink-0 ${
                                    isActive
                                    ? "bg-black border-black text-white"
                                    : "bg-transparent border-gray-100 text-gray-400 hover:border-gray-200 hover:text-black"
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 mb-16">
                            {paginatedProducts.map((product: Product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center space-x-4 border-t border-gray-100 pt-8">
                                {currentPage > 1 ? (
                                    <Link 
                                        href={buildPageUrl(currentPage - 1)}
                                        className="flex items-center px-4 py-2 border-2 border-gray-100 rounded-full text-sm font-bold uppercase tracking-widest hover:border-primary-red hover:text-primary-red transition-colors"
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                    </Link>
                                ) : (
                                    <div className="flex items-center px-4 py-2 border-2 border-gray-50 text-gray-300 rounded-full text-sm font-bold uppercase tracking-widest cursor-not-allowed">
                                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                    </div>
                                )}

                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Page {currentPage} of {totalPages}
                                </div>

                                {currentPage < totalPages ? (
                                    <Link 
                                        href={buildPageUrl(currentPage + 1)}
                                        className="flex items-center px-4 py-2 border-2 border-gray-100 rounded-full text-sm font-bold uppercase tracking-widest hover:border-primary-red hover:text-primary-red transition-colors"
                                    >
                                        Next <ChevronRight className="h-4 w-4 ml-1" />
                                    </Link>
                                ) : (
                                    <div className="flex items-center px-4 py-2 border-2 border-gray-50 text-gray-300 rounded-full text-sm font-bold uppercase tracking-widest cursor-not-allowed">
                                        Next <ChevronRight className="h-4 w-4 ml-1" />
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-20 text-center bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-gray-400 font-bold uppercase tracking-widest mb-2">No products found</p>
                        <p className="text-sm text-zinc-500 mb-6">We couldn&apos;t find any items matching your current filters.</p>
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
    );
}