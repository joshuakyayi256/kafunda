"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";

// Set the flash-sale end date here. Change this whenever you run a new promotion.
// Format: new Date("YYYY-MM-DDTHH:MM:SS")
const SALE_END = new Date("2026-04-30T23:59:59");

function getTimeLeft(end: Date) {
  const diff = Math.max(0, end.getTime() - Date.now());
  return {
    hours:   Math.floor(diff / 1000 / 60 / 60),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: diff === 0,
  };
}

const Pad = ({ n }: { n: number }) => (
  <span className="text-2xl md:text-3xl font-black tabular-nums text-white">
    {String(n).padStart(2, "0")}
  </span>
);

const Colon = () => (
  <span className="text-xl font-black text-primary-red mx-1 animate-pulse">:</span>
);

export default function CountdownBanner() {
  const [time, setTime] = useState(getTimeLeft(SALE_END));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTime(getTimeLeft(SALE_END)), 1000);
    return () => clearInterval(id);
  }, []);

  // Don't render if sale is over or before hydration to avoid mismatch
  if (!mounted || time.expired) return null;

  return (
    <section className="bg-zinc-950 border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: label */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-red shrink-0">
            <Zap className="h-4 w-4 text-white fill-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-red leading-none mb-0.5">
              Flash Sale
            </p>
            <p className="text-white font-bold text-sm leading-none">
              Up to <span className="text-primary-red">30% off</span> selected bottles
            </p>
          </div>
        </div>

        {/* Centre: countdown */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-2.5">
          <div className="flex flex-col items-center">
            <Pad n={time.hours} />
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Hrs</span>
          </div>
          <Colon />
          <div className="flex flex-col items-center">
            <Pad n={time.minutes} />
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Min</span>
          </div>
          <Colon />
          <div className="flex flex-col items-center">
            <Pad n={time.seconds} />
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Sec</span>
          </div>
        </div>

        {/* Right: CTA */}
        <Link
          href="/shop?filter=offers"
          className="flex items-center gap-2 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl transition-colors shrink-0"
        >
          Shop Deals
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
