import React from "react";
import { Skeleton, ProductGridSkeleton, LoadingAnnouncement } from "@/components/shared/Skeleton";

/** Shop loading state — mirrors the header, sidebar, category pills and grid. */
export default function ShopLoading() {
    return (
        <div className="bg-white min-h-screen">
            <LoadingAnnouncement label="Loading products" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                {/* Header */}
                <div className="mb-5 lg:mb-8 space-y-2">
                    <Skeleton className="h-7 md:h-10 w-56 md:w-80" />
                    <Skeleton className="h-3 w-24" />
                </div>

                {/* Mobile pills */}
                <div className="lg:hidden mb-5 flex gap-2 overflow-hidden">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-full" />
                    ))}
                </div>

                <div className="flex gap-10">
                    {/* Desktop sidebar */}
                    <div className="hidden lg:block w-56 shrink-0 space-y-3">
                        <Skeleton className="h-3 w-20 mb-5" />
                        <Skeleton className="h-9 w-full rounded-lg" />
                        {["w-24", "w-16", "w-28", "w-32", "w-20", "w-24", "w-28", "w-16", "w-32", "w-20", "w-24", "w-16"].map((w, i) => (
                            <Skeleton key={i} className={`h-3.5 ml-3 ${w}`} />
                        ))}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Desktop pills */}
                        <div className="hidden lg:flex gap-2 mb-8 overflow-hidden">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />
                            ))}
                        </div>
                        <ProductGridSkeleton count={12} />
                    </div>
                </div>
            </div>
        </div>
    );
}
