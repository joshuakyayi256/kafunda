"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

/**
 * PromoBanner - soft editorial promo strip between homepage shelves.
 *
 * Cream card with organic circles that GENTLY DRIFT on a continuous Framer
 * loop (premium, not distracting). Black eyebrow/CTA replaced with brand GREEN
 * per client (less black overall). Accent word stays crimson.
 *
 * Reusable: pass different copy/href to place more than one down the page.
 */
interface PromoBannerProps {
  eyebrow?: string;
  line1: string;
  accent?: string;
  line2: string;
  ctaLabel: string;
  href: string;
}

export default function PromoBanner({
  eyebrow = "Limited Time",
  line1,
  accent,
  line2,
  ctaLabel,
  href,
}: PromoBannerProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="relative overflow-hidden rounded-3xl bg-kafunda-bone border border-kafunda-bone-soft px-8 py-10 md:px-14 md:py-14">

        {/* Organic accent shapes - continuous gentle drift */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-kafunda-green/10"
          animate={{ y: [0, 18, 0], x: [0, -10, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute right-24 -bottom-12 h-40 w-40 rounded-full bg-kafunda-mustard/20"
          animate={{ y: [0, -16, 0], x: [0, 12, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-kafunda-green/8"
          animate={{ y: [0, 14, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        />

        <div className="relative">
          <span className="inline-block bg-kafunda-green text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-4">
            {eyebrow}
          </span>

          <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-[0.95] text-kafunda-ink max-w-2xl">
            {accent ? (
              <>
                {line1}{" "}
                <span className="text-kafunda-crimson">{accent}</span>
              </>
            ) : (
              line1
            )}
            <br />
            {line2}
          </h2>

          <Link
            href={href}
            className="inline-flex items-center gap-2 mt-7 bg-kafunda-green hover:bg-kafunda-green-deep text-white px-6 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-colors group"
          >
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}