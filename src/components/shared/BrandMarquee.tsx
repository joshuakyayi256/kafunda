"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRANDS, type Brand } from "@/lib/brands";

/**
 * Brand tile: the logo in FULL ORIGINAL COLOUR (per client - no greyscale)
 * on a uniform white card, so logos with white, black or transparent
 * backgrounds all sit consistently. The name + product count underneath
 * turns the strip into navigation ("Shop Hennessy · 14 products") instead
 * of decoration. If the image file is missing/broken the tile removes
 * itself, so we never render a broken-image icon.
 */
function BrandTile({ brand, count }: { brand: Brand; count?: number }) {
    const [failed, setFailed] = useState(false);
    if (failed) return null;

    return (
        <Link
            href={`/shop?brand=${encodeURIComponent(brand.name)}`}
            className="group/tile mx-1.5 sm:mx-2 shrink-0 w-32 sm:w-44 rounded-2xl bg-white border border-kafunda-bone-soft
                shadow-[0_1px_2px_rgba(20,20,20,0.04)] hover:border-kafunda-green/40 hover:shadow-[0_10px_28px_rgba(27,122,67,0.12)]
                hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
            aria-label={`Shop ${brand.name}${count ? ` (${count} products)` : ""}`}
        >
            <div className="relative h-16 sm:h-20 mx-3 sm:mx-4 mt-3 sm:mt-4">
                <Image
                    src={brand.logo}
                    alt=""
                    fill
                    sizes="176px"
                    className="object-contain transition-transform duration-300 group-hover/tile:scale-105"
                    unoptimized
                    onError={() => setFailed(true)}
                />
            </div>
            <div className="mt-2.5 sm:mt-3 px-3 py-2 border-t border-kafunda-bone-soft bg-kafunda-bone/60 group-hover/tile:bg-kafunda-green-tint transition-colors">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-kafunda-ink truncate text-center">
                    {brand.name}
                </p>
                <p className="flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-kafunda-green">
                    {count ? `${count} product${count === 1 ? "" : "s"}` : "Shop now"}
                    <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover/tile:translate-x-0.5" />
                </p>
            </div>
        </Link>
    );
}

/**
 * One seamless scrolling row. The set is repeated until it's long enough to
 * fill wide screens, then duplicated so translateX(-50%) loops with no gap.
 */
function MarqueeRow({
    brands,
    counts,
    reverse = false,
    seconds,
}: {
    brands: Brand[];
    counts?: Record<string, number>;
    reverse?: boolean;
    seconds: number;
}) {
    const MIN_TILES = 10;
    const base: Brand[] = [];
    while (base.length < MIN_TILES) base.push(...brands);
    const track = [...base, ...base];

    return (
        <div className="group relative w-full max-w-full overflow-hidden kafunda-marquee-fade py-1.5">
            <div
                className={`kafunda-marquee-track flex w-max items-stretch ${reverse ? "kafunda-marquee-track--reverse" : ""}`}
                style={{ animationDuration: `${seconds}s` }}
            >
                {track.map((brand, idx) => (
                    <BrandTile key={`${brand.name}-${idx}`} brand={brand} count={counts?.[brand.name]} />
                ))}
            </div>
        </div>
    );
}

/**
 * BrandMarquee - "Shop by Brand": two rows of brand tiles drifting in
 * opposite directions.
 *
 * `counts` (product count per brand, computed on the server from the live
 * catalogue) hides brands we don't currently stock, so a tap never lands on
 * an empty shop page. Without counts, every brand is shown.
 *
 * Animation CSS lives in globals.css (NOT inline styled-jsx) so server and
 * client render identical markup - no hydration mismatch. Pauses on hover,
 * respects reduced-motion (see globals).
 */
const BrandMarquee = ({ counts }: { counts?: Record<string, number> }) => {
    const brands = counts ? BRANDS.filter((b) => (counts[b.name] ?? 0) > 0) : BRANDS;
    if (brands.length < 2) return null;

    const half = Math.ceil(brands.length / 2);
    const rowA = brands.slice(0, half);
    const rowB = brands.length >= 8 ? brands.slice(half) : brands;

    return (
        <section className="py-8 md:py-14 bg-kafunda-bone border-t border-kafunda-bone-soft overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-end mb-4 md:mb-8">
                <div>
                    <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-1.5">
                        Genuine brands only
                    </p>
                    <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-kafunda-ink">
                        Shop by <span className="text-primary-red">Brand</span>
                    </h2>
                </div>
                <Link
                    href="/shop"
                    className="text-primary-red font-bold uppercase tracking-widest text-[10px] md:text-xs hover:underline flex items-center shrink-0"
                >
                    View All <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
            </div>

            <div className="space-y-2 sm:space-y-3">
                <MarqueeRow brands={rowA} counts={counts} seconds={45} />
                <MarqueeRow brands={rowB} counts={counts} seconds={55} reverse />
            </div>
        </section>
    );
};

export default BrandMarquee;
