import React from "react";
import { ProductSkeleton, CategorySkeleton, Skeleton } from "@/components/shared/Skeleton";

export default function Loading() {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Skeleton */}
            <div className="relative min-h-[90vh] bg-zinc-900 overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <Skeleton className="h-16 md:h-24 w-64 md:w-[600px] mb-8 bg-zinc-800" />
                    <Skeleton className="h-6 w-48 md:w-96 mb-12 bg-zinc-800" />
                    <Skeleton className="h-14 w-40 rounded-full bg-zinc-800" />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                {/* Categories Section Skeleton */}
                <div className="mb-16">
                    <Skeleton className="h-3 w-32 mb-4" />
                    <Skeleton className="h-10 w-64 mb-12" />
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                        {[...Array(5)].map((_, i) => (
                            <CategorySkeleton key={i} />
                        ))}
                    </div>
                </div>

                {/* Product Grid Skeleton */}
                <div>
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <Skeleton className="h-3 w-32 mb-4" />
                            <Skeleton className="h-10 w-64" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <ProductSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
