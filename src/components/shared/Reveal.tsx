"use client";

/**
 * Reveal — tasteful scroll-triggered entrance. Wrap any section:
 *
 *   <Reveal>            <ShelfRow .../>      </Reveal>
 *   <Reveal delay={80}> <PromoBanner .../>   </Reveal>
 *
 * Fades + rises slightly when it enters the viewport, once. Uses
 * IntersectionObserver (no animation library needed) and fully respects
 * prefers-reduced-motion — reduced-motion users see content immediately.
 *
 * Keep it restrained: wrap whole sections, not every element.
 */

import { useEffect, useRef, useState } from "react";

// Read the preference lazily at mount via the useState initializer, so we
// never call setState synchronously inside the effect (avoids the
// react-hooks/set-state-in-effect lint error + cascading renders).
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Reveal({
  children,
  delay = 0,
  y = 16,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number; // ms
  y?: number;     // px to rise from
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Start "shown" immediately when reduced motion is requested — no animation,
  // no effect-driven setState needed for that case.
  const [shown, setShown] = useState<boolean>(() => prefersReducedMotion());

  useEffect(() => {
    if (shown) return;          // already visible (reduced motion) — nothing to observe
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);     // called from observer callback, not synchronously in effect
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 600ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 600ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}