"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

const brands = [
    { name: "Captain Morgan", logo: "/logos/Captain-Morgan-Symbol.png" },
    { name: "Hennessy", logo: "/logos/Hennessy-Logo-PNG-Photo.png" },
    { name: "Belvedere", logo: "/logos/belvedere.webp" },
    { name: "Don Julio", logo: "/logos/don-julio.png" },
    { name: "Grey Goose", logo: "/logos/grey.webp" },
    { name: "Johnnie Walker", logo: "/logos/johnny.webp" },
];

/**
 * BrandMarquee - seamless infinite logo scroll.
 *
 * FIX (June 2026): the old version used two tracks (animate-marquee +
 * absolutely-positioned animate-marquee2 with no left anchor), which rendered
 * ~6500px wide and pushed the WHOLE PAGE into horizontal overflow (navbar/hero
 * appeared shifted off the left edge on mobile).
 *
 * This version uses ONE flex track containing the brand set TWICE, animated by
 * translateX(-50%) so it loops seamlessly. The outer wrapper is
 * overflow-hidden + w-full + max-w-full, so the wide track is clipped to the
 * viewport and can never push page width. The animation is defined inline (no
 * dependency on whatever animate-marquee/2 keyframes existed) and pauses on
 * hover + respects reduced-motion.
 */
const BrandMarquee = () => {
    const track = [...brands, ...brands]; // duplicate set for seamless loop

    return (
        <section className="py-12 bg-white border-y border-gray-100 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 mb-8">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] text-center">
                    Featured Premium Brands
                </p>
            </div>

            {/* Clipping viewport: full width, hides the overflowing track.
                max-w-full + w-full + overflow-hidden guarantee no page overflow. */}
            <div className="group relative w-full max-w-full overflow-hidden">
                <div className="kafunda-marquee-track flex w-max items-center">
                    {track.map((brand, idx) => (
                        <Link
                            key={idx}
                            href={`/shop?brand=${encodeURIComponent(brand.name)}`}
                            className="mx-12 flex items-center justify-center shrink-0 group/item"
                            aria-label={brand.name}
                        >
                            <div className="relative h-12 w-40 grayscale opacity-80 group-hover/item:grayscale-0 group-hover/item:opacity-100 transition-all duration-500">
                                <Image
                                    src={brand.logo}
                                    alt={brand.name}
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Scoped animation. Defined here so it doesn't depend on external
                keyframes. Two copies + translateX(-50%) = seamless loop. */}
            <style jsx>{`
                .kafunda-marquee-track {
                    animation: kafunda-marquee 40s linear infinite;
                    will-change: transform;
                }
                .group:hover .kafunda-marquee-track {
                    animation-play-state: paused;
                }
                @keyframes kafunda-marquee {
                    from { transform: translateX(0); }
                    to   { transform: translateX(-50%); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .kafunda-marquee-track {
                        animation: none;
                        transform: translateX(0);
                    }
                }
            `}</style>
        </section>
    );
};

export default BrandMarquee;