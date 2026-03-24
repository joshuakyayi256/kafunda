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

const BrandMarquee = () => {
    return (
        <section className="py-12 bg-white border-y border-gray-100 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 mb-8">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] text-center">
                    Featured Premium Brands
                </p>
            </div>

            <div className="relative flex overflow-x-hidden group">
                <div className="flex animate-marquee whitespace-nowrap py-10">
                    {[...brands, ...brands].map((brand, idx) => (
                        <Link
                            key={idx}
                            href={`/shop?brand=${brand.name}`}
                            className="mx-16 flex items-center justify-center min-w-[200px] group/item"
                        >
                            <div className="relative h-12 w-48 grayscale opacity-50 group-hover/item:grayscale-0 group-hover/item:opacity-100 transition-all duration-500">
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

                <div className="absolute top-0 flex animate-marquee2 whitespace-nowrap py-10">
                    {[...brands, ...brands].map((brand, idx) => (
                        <Link
                            key={idx}
                            href={`/shop?brand=${brand.name}`}
                            className="mx-16 flex items-center justify-center min-w-[200px] group/item"
                        >
                            <div className="relative h-12 w-48 grayscale opacity-50 group-hover/item:grayscale-0 group-hover/item:opacity-100 transition-all duration-500">
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
        </section>
    );
};

export default BrandMarquee;
