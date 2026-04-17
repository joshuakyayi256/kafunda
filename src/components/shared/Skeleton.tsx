import React from "react";

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-zinc-200 rounded-lg ${className}`} />
    );
}

export function ProductSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
        </div>
    );
}

export function CategorySkeleton() {
    return (
        <div className="flex flex-col items-center gap-4 min-w-[112px]">
            <Skeleton className="w-28 h-40 md:w-full md:aspect-2/3 rounded-full" />
            <Skeleton className="h-4 w-20" />
        </div>
    );
}
