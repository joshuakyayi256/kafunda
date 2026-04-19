"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1474722883778-792e7990302f?q=80&w=2000",
    eyebrow: "Curated Wines",
    heading: "The Finest",
    highlight: "Wines",
    sub: "From Bordeaux to Barossa Valley — handpicked for your table.",
    cta: "Shop Wines",
    href: "/shop?category=Wines",
    accent: "#c62828",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1527281400683-1aefee6bdb96?q=80&w=2000",
    eyebrow: "Premium Spirits",
    heading: "World-Class",
    highlight: "Whiskies",
    sub: "Single malts, blends, and rare expressions delivered to your door.",
    cta: "Shop Whiskies",
    href: "/shop?category=Whisky",
    accent: "#c5b358",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=2000",
    eyebrow: "Celebrate in Style",
    heading: "Luxury",
    highlight: "Champagnes",
    sub: "Moët, Veuve Clicquot, and more — every occasion deserves the best.",
    cta: "Shop Champagnes",
    href: "/shop?category=Champagne",
    accent: "#c5b358",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2000",
    eyebrow: "Aged to Perfection",
    heading: "Exquisite",
    highlight: "Cognacs",
    sub: "Hennessy, Rémy Martin, and rare cognacs for the discerning palate.",
    cta: "Shop Cognacs",
    href: "/shop?category=Cognacs",
    accent: "#c62828",
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [isAutoPlaying, next]);

  const slide = SLIDES[current];

  return (
    <section className="relative min-h-[92vh] md:min-h-screen flex items-center overflow-hidden bg-zinc-950">
      {/* Slides */}
      <AnimatePresence mode="sync">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={slide.highlight}
            fill
            priority
            className="object-cover opacity-35"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-r from-zinc-950 via-zinc-950/70 to-zinc-950/20" />
          <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16 md:pt-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[10px] font-black uppercase tracking-[0.4em] mb-5"
              style={{ color: slide.accent }}
            >
              {slide.eyebrow}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.88] mb-6"
            >
              {slide.heading}{" "}
              <span style={{ color: slide.accent }}>{slide.highlight}</span>
              <br />
              <span className="text-zinc-400 text-3xl md:text-4xl lg:text-5xl">Delivered.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-zinc-400 text-base md:text-lg font-medium mb-10 max-w-lg"
            >
              {slide.sub}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-4"
            >
              <Link
                href={slide.href}
                className="inline-flex items-center gap-2 text-white px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95"
                style={{ backgroundColor: slide.accent }}
              >
                {slide.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Prev / Next */}
      <button
        onClick={() => { prev(); setIsAutoPlaying(false); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => { next(); setIsAutoPlaying(false); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setCurrent(i); setIsAutoPlaying(false); }}
            aria-label={`Go to slide ${i + 1}`}
            className="transition-all duration-500"
          >
            <div
              className={`h-1 rounded-full transition-all duration-500 ${i === current ? "w-8 bg-primary-red" : "w-2 bg-white/30 hover:bg-white/50"}`}
            />
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {isAutoPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
          <motion.div
            key={current}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 6, ease: "linear" }}
            className="h-full bg-primary-red"
          />
        </div>
      )}
    </section>
  );
}
