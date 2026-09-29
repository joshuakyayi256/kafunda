import React from "react";
import { HeroSkeleton, ShelfSkeleton, LoadingAnnouncement } from "@/components/shared/Skeleton";

/**
 * Homepage loading state (also the fallback for routes without their own
 * loading.tsx). Mirrors the real homepage — hero, then product shelves — so
 * the page fills in place instead of jumping.
 */
export default function Loading() {
    return (
        <div className="min-h-screen bg-kafunda-bone">
            <LoadingAnnouncement label="Loading Kafunda" />
            <HeroSkeleton />
            <ShelfSkeleton />
            <ShelfSkeleton />
        </div>
    );
}
