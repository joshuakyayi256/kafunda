"use client";

/**
 * SmoothScroll — Lenis-powered smooth scrolling for the whole site.
 *
 * Install once:   npm install lenis
 *
 * Wire it in src/app/layout.tsx by wrapping {children}:
 *
 *   import SmoothScroll from "@/components/providers/SmoothScroll";
 *   ...
 *   <body>
 *     <SmoothScroll>
 *       {children}
 *     </SmoothScroll>
 *   </body>
 *
 * Respects prefers-reduced-motion (accessibility): users who ask for reduced
 * motion get native scrolling, no smoothing.
 */

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Honor reduced-motion: skip smoothing entirely.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.1,                 // a touch of glide; lower = snappier
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}