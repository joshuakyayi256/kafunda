"use client";

/**
 * Homepage hero, built to sell every day — the first thing ad, push and app
 * traffic sees. Four real bottles with one-tap Add to cart, a new set at
 * Kampala midnight (so the countdown is true), and a reason to come back
 * tomorrow. Runs all year; a live sale only puts its name on top.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock, MessageCircle, Plus } from "lucide-react";
import { Product } from "@/types";
import { formatUGX } from "@/lib/utils";
import { CONTACT, DELIVERY } from "@/lib/constants";
import { nextKampalaMidnight } from "@/lib/dailyPicks";
import { useCart } from "@/context/CartContext";

function hms(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

function NewPicksCountdown() {
  // null until mounted so server and client markup match.
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setLeft(hms(nextKampalaMidnight() - Date.now()));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  return (
    <p className="inline-flex items-center gap-2 text-xs font-bold text-white/70 sm:text-sm">
      <Clock className="h-4 w-4 text-brand-gold" />
      New picks in
      <span className="font-black tabular-nums text-white">{left ?? "--:--:--"}</span>
    </p>
  );
}

function PickCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  // Only a real sale price in WooCommerce earns a saving badge.
  const saving = product.original_price_ugx ? product.original_price_ugx - product.price_ugx : 0;

  const add = () => {
    addToCart(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1100);
  };

  return (
    <div className="group relative flex min-w-0 flex-col rounded-2xl bg-white p-2.5 shadow-lg ring-1 ring-black/5">
      {saving > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-kafunda-crimson px-2 py-0.5 text-[10px] font-black text-white">
          Save {formatUGX(saving)}
        </span>
      )}
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-square w-full">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            loading="eager"
            sizes="(max-width: 768px) 45vw, 200px"
            className="object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <p className="mt-2 line-clamp-2 min-h-8 text-[11px] font-bold leading-4 text-zinc-800 sm:text-xs">{product.name}</p>
      </Link>
      <p className="mt-1 text-sm font-black text-kafunda-green">
        {formatUGX(product.price_ugx)}
        {saving > 0 && (
          <span className="ml-1 text-[10px] font-semibold text-zinc-400 line-through">{formatUGX(product.original_price_ugx!)}</span>
        )}
      </p>
      <button
        type="button"
        onClick={add}
        aria-label={added ? `${product.name} added` : `Add ${product.name} to cart`}
        className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1 rounded-xl bg-kafunda-green text-xs font-black uppercase tracking-wide text-white transition-colors hover:bg-kafunda-green-deep active:scale-[0.98]"
      >
        {added ? <Check className="h-4 w-4" strokeWidth={3} /> : <Plus className="h-4 w-4" strokeWidth={3} />}
        {added ? "Added" : "Add to cart"}
      </button>
    </div>
  );
}

export default function DailyPicksHero({
  picks,
  saleName,
  saleEnds,
}: {
  picks: Product[];
  saleName?: string;
  saleEnds?: string;
}) {
  const [first, ...rest] = (saleName ?? "Today's Picks").split(" ");
  const shopLabel = saleName ? "Shop the sale" : "Shop all";
  const waHref = `${CONTACT.whatsapp}?text=${encodeURIComponent("Hi Kafunda! I'd like to order from today's picks.")}`;

  return (
    <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 md:pt-6 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl bg-kafunda-ink md:rounded-3xl">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-kafunda-green/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-brand-gold/20 blur-3xl" />

        <div className="relative grid gap-4 p-3 sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,300px)_1fr] lg:items-center lg:gap-8 lg:p-8">
          <div className="px-1 pt-1 sm:p-0">
            {saleEnds && (
              <p className="mb-2 inline-flex rounded-full bg-brand-gold/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold ring-1 ring-brand-gold/30">
                On now · {saleEnds}
              </p>
            )}
            <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tighter text-white sm:text-5xl">
              {first}{" "}
              <span className="bg-linear-to-r from-brand-gold to-kafunda-mustard bg-clip-text text-transparent lg:block">
                {rest.join(" ")}
              </span>
            </h1>
            <p className="mt-2 text-sm font-medium text-white/75">
              Today&apos;s picks, delivered in {DELIVERY.estimatedTime.replace("-", "–")}. Pay on delivery.
            </p>
            <div className="mt-3">
              <NewPicksCountdown />
            </div>

            <div className="mt-4 hidden flex-col gap-2 lg:flex">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-black uppercase tracking-wider text-kafunda-ink transition-colors hover:bg-kafunda-bone"
              >
                {shopLabel} <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-white/20"
              >
                <MessageCircle className="h-4 w-4" /> Order on WhatsApp
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            {picks.map((p) => <PickCard key={p.id} product={p} />)}
          </div>

          {/* Phones and tablets: buttons come after the products, so bottles are on screen first. */}
          <div className="grid grid-cols-2 gap-2 lg:hidden">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-3 py-3 text-[11px] font-black uppercase tracking-wide text-kafunda-ink"
            >
              {shopLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-3 text-[11px] font-black uppercase tracking-wide text-white"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
