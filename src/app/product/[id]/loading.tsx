import React from "react";
import { Skeleton, LoadingAnnouncement } from "@/components/shared/Skeleton";

/** Product page loading state — mirrors breadcrumbs, gallery and details column. */
export default function ProductLoading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <LoadingAnnouncement label="Loading product" />
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 mb-8">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-40" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
                {/* Gallery */}
                <div className="space-y-4">
                    <Skeleton className="aspect-square w-full" />
                    <div className="grid grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="aspect-square w-full rounded-md" />
                        ))}
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 md:h-10 w-full" />
                    <Skeleton className="h-8 md:h-10 w-2/3" />
                    <Skeleton className="h-8 w-40" />
                    <div className="space-y-2 pt-2">
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-4/5" />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Skeleton className="h-14 w-32 rounded-xl" />
                        <Skeleton className="h-14 flex-1 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
