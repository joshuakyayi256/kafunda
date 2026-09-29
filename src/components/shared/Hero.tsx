"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Truck, Smartphone } from "lucide-react";

/**
 * Image-led hero, tuned for mobile ad traffic.
 * - Height is driven by viewport WIDTH on phones (so the photo keeps a sane
 *   crop instead of becoming a tall sliver) and by viewport height on desktop.
 * - A strong bottom scrim keeps the headline readable on ANY photo — the
 *   old light scrim let white text vanish into bright glassware.
 * - Image, headline and CTA change together (one key), so the button never
 *   says "Whiskies" over a wine photo mid-transition.
 * - Trust line (delivery time + payment options) answers the two questions
 *   ad visitors have before they scroll.
 *
 * NOTE: images are Unsplash stock placeholders (host allowlisted in
 * next.config). Swap for Kafunda's own photography by editing SLIDES.
 */
const SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2400",
    alt: "Glasses of red wine on a dark bar",
    line: "Fine wines, delivered in hours.",
    cta: "Shop Wines",
    href: "/shop?category=Wines",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1527281400683-1aefee6bdb96?q=80&w=2400",
    alt: "Premium whisky bottles on a shelf",
    line: "Single malts worth savouring.",
    cta: "Shop Whiskies",
    href: "/shop?category=Whiskys",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1547595628-c61a29f496f0?q=80&w=2400",
    alt: "Champagne being poured into glasses",
    line: "Every occasion deserves bubbles.",
    cta: "Shop Champagnes",
    href: "/shop?category=Champagnes",
  },
];

const SLIDE_MS = 6000;

export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 md:pt-7">
      <section
        className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-kafunda-ink shadow-sm
          h-[68vw] min-h-60 max-h-100 sm:h-[46vh] sm:max-h-none md:h-[54vh] md:min-h-105"
      >
        {/* Imagery */}
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={slide.id === 1}
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Legibility scrim — strong at the bottom where the copy sits. */}
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/45 to-black/5" />

        {/* Copy + CTAs, bottom-left */}
        <div className="absolute inset-x-0 bottom-0 px-4 sm:px-8 lg:px-12 pb-4 sm:pb-8 md:pb-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-white text-[22px] leading-tight sm:text-3xl md:text-5xl font-black tracking-tight max-w-xl mb-2 sm:mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                {slide.line}
              </p>

              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/90 text-[11px] sm:text-sm font-semibold mb-3 sm:mb-5 drop-shadow">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 1–2 hr delivery in Kampala
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Mobile Money · Card · Cash
                </span>
              </p>

              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href={slide.href}
                  className="inline-flex items-center justify-center gap-2 bg-primary-red hover:bg-primary-red-hover text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-colors shadow-lg"
                >
                  {slide.cta} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/40 text-white px-4 sm:px-6 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-colors"
                >
                  Browse All
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slide ticks */}
          <div className="flex gap-1.5 mt-3 sm:mt-6">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                aria-label={"Show slide " + (i + 1)}
                onClick={() => setIndex(i)}
                className={
                  "h-1 rounded-full transition-all duration-500 " +
                  (i === index ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/60")
                }
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
