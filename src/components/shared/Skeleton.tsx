import React from "react";

/**
 * Loading placeholders. Every skeleton mirrors the SIZE and SHAPE of the real
 * component it stands in for, so when content arrives nothing jumps — the
 * page just "fills in". Shimmer styling lives in globals.css (.shimmer).
 */

export function Skeleton({ className = "", dark = false }: { className?: string; dark?: boolean }) {
    return <div aria-hidden="true" className={`shimmer ${dark ? "shimmer-dark" : ""} rounded-lg ${className}`} />;
}

/** Mirrors ProductCard: square image, category line, 2-line title, price + add button. */
export function ProductSkeleton() {
    return (
        <div aria-hidden="true" className="h-full w-full bg-white rounded-2xl overflow-hidden border border-kafunda-bone-soft flex flex-col">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="px-2.5 sm:px-3.5 pt-2 sm:pt-3 pb-3 sm:pb-4 flex flex-col gap-2">
                <Skeleton className="h-2.5 w-1/3" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
                <div className="mt-1 flex items-center justify-between">
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>
        </div>
    );
}

/** Mirrors Hero: same heights per breakpoint, dark with copy + CTA shapes bottom-left. */
export function HeroSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 md:pt-7">
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl h-[68vw] min-h-60 max-h-100 sm:h-[46vh] sm:max-h-none md:h-[54vh] md:min-h-105">
                <Skeleton dark className="absolute inset-0 rounded-none" />
                <div className="absolute inset-x-0 bottom-0 px-4 sm:px-8 lg:px-12 pb-4 sm:pb-8 md:pb-12 space-y-3">
                    <Skeleton dark className="h-6 sm:h-9 md:h-12 w-3/4 max-w-lg" />
                    <Skeleton dark className="h-3 sm:h-4 w-1/2 max-w-xs" />
                    <div className="flex gap-2 pt-1">
                        <Skeleton dark className="h-10 sm:h-12 w-32 sm:w-40 rounded-full" />
                        <Skeleton dark className="h-10 sm:h-12 w-24 sm:w-32 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Mirrors CategoryShelf: heading row + horizontal row of fixed-width cards. */
export function ShelfSkeleton({ cards = 6 }: { cards?: number }) {
    return (
        <section aria-hidden="true" className="py-6 md:py-12 border-t border-kafunda-bone-soft">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-end mb-3 md:mb-8">
                    <div className="space-y-2">
                        <Skeleton className="h-2.5 w-24" />
                        <Skeleton className="h-6 md:h-8 w-48 md:w-64" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex gap-2 sm:gap-4 overflow-hidden pb-3 sm:pb-4">
                    {Array.from({ length: cards }).map((_, i) => (
                        <div key={i} className="shrink-0 flex w-[42vw] max-w-45 sm:w-50 sm:max-w-none lg:w-57.5">
                            <ProductSkeleton />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Mirrors the shop grid (2 / 3 / 4 columns). */
export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div aria-hidden="true" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <ProductSkeleton key={i} />
            ))}
        </div>
    );
}

/** Kept for existing imports. */
export function CategorySkeleton() {
    return (
        <div aria-hidden="true" className="flex flex-col items-center gap-4 min-w-28">
            <Skeleton className="w-28 h-40 md:w-full md:aspect-2/3 rounded-full" />
            <Skeleton className="h-4 w-20" />
        </div>
    );
}

/** Screen-reader announcement for route-level loading states. */
export function LoadingAnnouncement({ label = "Loading" }: { label?: string }) {
    return <span className="sr-only" role="status">{label}…</span>;
}
