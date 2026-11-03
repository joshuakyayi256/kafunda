"use client";

/**
 * Black November hero — the first thing ad traffic sees.
 * Product-led (real bottles from the catalogue, not stock photos), one clear
 * offer, a live countdown to the end of the month, and the two answers every
 * Kampala visitor wants before buying: how fast, and how do I pay.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, Truck, Smartphone, BadgePercent } from "lucide-react";
import { Product } from "@/types";
import { formatUGX } from "@/lib/utils";
import { CAMPAIGN } from "@/lib/campaign";
import { CONTACT, FREE_DELIVERY } from "@/lib/constants";

function timeLeft(end: number) {
  const ms = Math.max(0, end - Date.now());
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor(ms / 3_600_000) % 24,
    m: Math.floor(ms / 60_000) % 60,
    s: Math.floor(ms / 1000) % 60,
  };
}

function Countdown() {
  // null until mounted so server and client markup match.
  const [t, setT] = useState<ReturnType<typeof timeLeft> | null>(null);
  useEffect(() => {
    const end = CAMPAIGN.end.getTime();
    const tick = () => setT(timeLeft(end));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  const cells: [string, number | undefined][] = [
    ["Days", t?.d], ["Hrs", t?.h], ["Min", t?.m], ["Sec", t?.s],
  ];
  return (
    <div className="flex items-center gap-1.5 sm:gap-2" aria-label="Time left in the sale">
      {cells.map(([label, v]) => (
        <div key={label} className="flex min-w-12 flex-col items-center rounded-xl bg-white/10 px-2 py-1.5 ring-1 ring-white/15 sm:min-w-15 sm:py-2">
          <span className="text-lg font-black tabular-nums leading-none text-white sm:text-2xl">
            {v === undefined ? "--" : String(v).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/50">{label}</span>
        </div>
      ))}
    </div>
  );
}

function DealTile({ product, big }: { product: Product; big?: boolean }) {
  const pct = product.original_price_ugx
    ? Math.round((1 - product.price_ugx / product.original_price_ugx) * 100)
    : 0;
  return (
    <Link
      href={`/product/${product.id}`}
      className={`group relative flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white p-2.5 shadow-lg ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 ${big ? "sm:row-span-2" : ""}`}
    >
      {pct > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-kafunda-crimson px-2 py-0.5 text-[10px] font-black text-white">
          −{pct}%
        </span>
      )}
      {/* Square on phones/tablets; on desktop the collage has a fixed height, so
          the photo flexes and the name + price always stay visible. */}
      <div className="relative aspect-square w-full lg:aspect-auto lg:min-h-0 lg:flex-1">
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 30vw, 220px"
          className="object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <p className="mt-2 line-clamp-1 text-[11px] font-bold text-zinc-800 sm:text-xs">{product.name}</p>
      <p className="text-xs font-black text-kafunda-green sm:text-sm">
        {formatUGX(product.price_ugx)}
        {product.original_price_ugx ? (
          <span className="ml-1 hidden text-[10px] font-semibold text-zinc-400 line-through sm:inline">{formatUGX(product.original_price_ugx)}</span>
        ) : null}
      </p>
    </Link>
  );
}

/** 3 random products from the pool, picked fresh on every visit. */
function useRandomPicks(pool: Product[]): { picks: Product[]; ready: boolean } {
  const [picks, setPicks] = useState<Product[]>(() => pool.slice(0, 3));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Deferred so the server HTML and first client render match, then shuffle.
    const t = setTimeout(() => {
      const copy = [...pool];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setPicks(copy.slice(0, 3));
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, [pool]);
  return { picks, ready };
}

export default function BlackNovemberHero({ pool, hasDeals }: { pool: Product[]; hasDeals: boolean }) {
  const { picks, ready } = useRandomPicks(pool);
  const waText = encodeURIComponent(`Hi Kafunda! I'd like to order from the ${CAMPAIGN.name} deals.`);

  return (
    <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 md:pt-6 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl bg-kafunda-ink md:rounded-3xl">
        {/* Glow accents */}
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-kafunda-green/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-brand-gold/20 blur-3xl" />

        <div className="relative grid gap-6 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-10 lg:px-12 lg:py-12">
          {/* Copy */}
          <div>
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-gold/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-brand-gold ring-1 ring-brand-gold/30">
              <BadgePercent className="h-3.5 w-3.5" /> On now · Ends 30 Nov
            </p>
            <h1 className="text-[44px] font-black uppercase leading-[0.9] tracking-tighter text-white sm:text-6xl lg:text-7xl">
              Black<br />
              <span className="bg-linear-to-r from-brand-gold to-kafunda-mustard bg-clip-text text-transparent">November</span>
            </h1>
            <p className="mt-3 max-w-md text-sm font-medium text-white/75 sm:text-base">
              {CAMPAIGN.tagline}. {hasDeals ? "Real price drops, delivered to your door." : "Stock up for the festive season, delivered to your door."}
            </p>

            <div className="mt-5">
              <Countdown />
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Link
                href={CAMPAIGN.dealsHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-kafunda-green px-7 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-kafunda-green/30 transition-colors hover:bg-kafunda-green-deep"
              >
                Shop the deals <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={`${CONTACT.whatsapp}?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-white/20"
              >
                <MessageCircle className="h-4 w-4" /> Order on WhatsApp
              </a>
            </div>

            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-semibold text-white/70 sm:text-xs">
              <li className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-kafunda-green" /> 1–2 hr delivery in Kampala</li>
              <li className="inline-flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-kafunda-green" /> Mobile Money · Card · Cash</li>
              <li className="inline-flex items-center gap-1.5"><BadgePercent className="h-3.5 w-3.5 text-kafunda-green" /> {FREE_DELIVERY.shortLabel}</li>
            </ul>
          </div>

          {/* Product collage */}
          {picks.length >= 3 && (
            <div className={`grid grid-cols-3 gap-2 transition-opacity duration-500 sm:grid-cols-2 sm:grid-rows-2 sm:gap-3 lg:h-105 ${ready ? "opacity-100" : "opacity-0"}`}>
              {picks.map((p, i) => <DealTile key={p.id} product={p} big={i === 0} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
