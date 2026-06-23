"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Brand list. `logo` is the expected file path in /public/logos/.
 * Add files as you get them — any brand whose image fails to load is hidden
 * automatically (see BrandLogo onError), so missing logos never show as
 * broken-image icons.
 *
 * Existing files (already in /public/logos/) are wired to their real names;
 * the rest use a predictable slug — drop a matching PNG in and it appears.
 */
const brands: { name: string; logo: string }[] = [
    // — already present —
    { name: "Captain Morgan", logo: "/logos/Captain-Morgan-Symbol.png" },
    { name: "Hennessy", logo: "/logos/Hennessy-Logo-PNG-Photo.png" },
    { name: "Belvedere", logo: "/logos/belvedere.webp" },
    { name: "Don Julio", logo: "/logos/don-julio.png" },
    { name: "Grey Goose", logo: "/logos/grey.webp" },
    { name: "Johnnie Walker", logo: "/logos/johnny.webp" },
    // — client's added brands (drop PNGs with these names into /public/logos/) —
    { name: "Uganda Waragi", logo: "/logos/uganda-waragi.png" },
    { name: "Smirnoff", logo: "/logos/smirnoff.png" },
    { name: "Jack Daniels", logo: "/logos/jack-daniels.png" },
    { name: "Jameson", logo: "/logos/jameson.png" },
    { name: "Monin", logo: "/logos/monin.png" },
    { name: "Roe & Co", logo: "/logos/roe-and-co.png" },
    { name: "Martell", logo: "/logos/martell.png" },
    { name: "Singleton", logo: "/logos/singleton.png" },
    { name: "Grants", logo: "/logos/grants.png" },
    { name: "Chivas", logo: "/logos/chivas.png" },
    { name: "Ciroc", logo: "/logos/ciroc.png" },
    { name: "Absolut", logo: "/logos/absolut.png" },
    { name: "Jagermeister", logo: "/logos/jagermeister.png" },
    { name: "Amarula", logo: "/logos/amarula.png" },
    { name: "Baileys", logo: "/logos/baileys.png" },
];

/**
 * Single logo with graceful fallback: if the image file is missing/broken,
 * the link removes itself so we never render a broken-image icon. This lets
 * you ship all brands now and have each appear as you add its file.
 */
function BrandLogo({ name, logo }: { name: string; logo: string }) {
    const [failed, setFailed] = useState(false);
    if (failed) return null;

    return (
        <Link
            href={`/shop?brand=${encodeURIComponent(name)}`}
            className="mx-12 flex items-center justify-center shrink-0 group/item"
            aria-label={name}
        >
            <div className="relative h-12 w-40 grayscale opacity-80 group-hover/item:grayscale-0 group-hover/item:opacity-100 transition-all duration-500">
                <Image
                    src={logo}
                    alt={name}
                    fill
                    className="object-contain"
                    unoptimized
                    onError={() => setFailed(true)}
                />
            </div>
        </Link>
    );
}

/**
 * BrandMarquee — seamless infinite logo scroll.
 *
 * Single flex track with the brand set duplicated, animated via the
 * .kafunda-marquee-track class (defined in globals.css) using translateX(-50%)
 * for a seamless loop. Wrapper is overflow-hidden + w-full + max-w-full so the
 * wide track is clipped to the viewport and can never push page width.
 *
 * Animation CSS lives in globals.css (NOT inline styled-jsx) so server and
 * client render identical markup — no hydration mismatch. Pauses on hover,
 * respects reduced-motion (see globals).
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

            <div className="group relative w-full max-w-full overflow-hidden">
                <div className="kafunda-marquee-track flex w-max items-center">
                    {track.map((brand, idx) => (
                        <BrandLogo key={`${brand.name}-${idx}`} name={brand.name} logo={brand.logo} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BrandMarquee;