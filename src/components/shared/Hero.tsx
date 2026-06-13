"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

/**
 * Minimal, image-led hero.
 * Big photography, one short line, two CTAs. Slides crossfade slowly with
 * no carousel chrome (no arrows) - the imagery is the message.
 *
 * NOTE: images are attractive Unsplash stock placeholders (host already
 * allowlisted in next.config). Swap the URLs for Kafunda's own product
 * photography when it's ready - just edit SLIDES below.
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
    href: "/shop?category=Whisky",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1547595628-c61a29f496f0?q=80&w=2400",
    alt: "Champagne being poured into glasses",
    line: "Every occasion deserves bubbles.",
    cta: "Shop Champagnes",
    href: "/shop?category=Champagne",
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 md:pt-7">
    <section className="relative h-[46vh] min-h-85 md:h-[54vh] md:min-h-105 overflow-hidden rounded-3xl bg-kafunda-ink shadow-sm">
      {/* Imagery */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={slide.alt}
            fill
            priority={slide.id === 1}
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Legibility scrim - bottom-weighted so the image stays the star */}
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent" />

      {/* Copy - one line + CTAs, bottom-left */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="px-6 sm:px-8 lg:px-12 pb-8 md:pb-12">
          <AnimatePresence mode="wait">
            <motion.p
              key={slide.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.45 }}
              className="text-white text-2xl sm:text-3xl md:text-4xl font-black tracking-tight max-w-xl mb-5"
            >
              {slide.line}
            </motion.p>
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={slide.href}
              className="inline-flex items-center gap-2 bg-primary-red hover:bg-primary-red-hover text-white px-6 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-colors"
            >
              {slide.cta} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white px-6 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-colors"
            >
              Browse All
            </Link>
          </div>

          {/* Slide progress - three thin ticks, no chrome */}
          <div className="flex gap-1.5 mt-6">
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
      </div>
    </section>
    </div>
  );
}