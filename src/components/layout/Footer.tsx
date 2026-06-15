"use client";

import React from "react";
import Link from "next/link";
import { Apple, Play, ArrowRight } from "lucide-react";
import { CONTACT, SOCIAL, SITE } from "@/lib/constants";

/**
 * Footer (June 2026, redesigned).
 *
 * Three bands, one cohesive deep-green surface:
 *  1. App CTA panel  - integrated (not a detached black bar): mark + value
 *     line + refined store buttons, on a slightly raised green panel.
 *  2. Footer body     - link columns (Shop / Help / Company / Connect) sitting
 *     ON TOP of an oversized low-opacity KAFUNDA watermark (the signature
 *     element, now atmosphere rather than a competing block).
 *  3. Legal bar       - copyright + 18+ + quick legal links.
 *
 * APP_LINKS: apps are live - replace the two search URLs below with the real
 * listing URLs (one place to edit).
 */

const APP_LINKS = {
  ios: "https://apps.apple.com/search?term=kafunda%20winestore",
  android: "https://play.google.com/store/search?q=kafunda%20winestore&c=apps",
};

const SHOP_LINKS = [
  { label: "Beers & Ciders", href: "/shop?category=Beers" },
  { label: "Wines", href: "/shop?category=Wines" },
  { label: "Whiskies", href: "/shop?category=Whisky" },
  { label: "Gins & Vodkas", href: "/shop?category=Gins" },
  { label: "Today's Offers", href: "/shop?filter=offers" },
];

const HELP_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Delivery", href: "/delivery" },
  { label: "Contact Us", href: CONTACT.whatsapp, external: true },
];

const COMPANY_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

function StoreButton({
  href, top, bottom, Icon,
}: { href: string; top: string; bottom: string; Icon: React.ElementType }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-white text-kafunda-ink rounded-xl px-5 py-2.5 shadow-sm hover:bg-kafunda-bone hover:-translate-y-0.5 transition-all duration-200"
    >
      <Icon className="h-6 w-6 shrink-0" />
      <span className="flex flex-col leading-none text-left">
        <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">{top}</span>
        <span className="text-sm font-black">{bottom}</span>
      </span>
    </a>
  );
}

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-kafunda-mustard mb-4">
      {children}
    </h4>
  );
}

const linkClass =
  "text-sm text-white/70 hover:text-white transition-colors";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-kafunda-green-deep text-white pb-28 md:pb-0">

      {/* ── 1. App CTA panel (integrated, not detached) ───────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16">
        <div className="relative overflow-hidden rounded-3xl bg-kafunda-green border border-white/10 px-6 py-8 md:px-10 md:py-9 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* faint corner glow so the panel reads as raised, on-brand */}
          <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-kafunda-mustard/10 blur-2xl" />
          <div className="relative text-center md:text-left">
            <h3 className="text-xl md:text-2xl font-black tracking-tight">
              Get the <span className="text-kafunda-mustard">Kafunda</span> app
            </h3>
            <p className="text-sm text-white/70 mt-1.5 max-w-md">
              Faster ordering, app-only offers, and 1&ndash;2 hour delivery to your door.
            </p>
          </div>
          <div className="relative flex flex-wrap items-center justify-center gap-3 shrink-0">
            <StoreButton href={APP_LINKS.android} top="Get it on" bottom="Google Play" Icon={Play} />
            <StoreButton href={APP_LINKS.ios} top="Download on the" bottom="App Store" Icon={Apple} />
          </div>
        </div>
      </div>

      {/* ── 2. Footer body: columns over the watermark wordmark ───────────── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-20 md:pb-14">

        {/* Oversized KAFUNDA watermark, behind the columns (the signature
            element as atmosphere). aria-hidden: decorative only. */}
        <span
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-x-0 bottom-0 z-0 text-center font-heading font-black uppercase tracking-tighter leading-none text-white/[0.05] text-[26vw] md:text-[20vw] whitespace-nowrap"
        >
          Kafunda
        </span>

        {/* Columns sit above the watermark */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">

          {/* Brand + tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label={`${SITE.name} - home`} className="inline-block">
              <span className="font-heading font-black uppercase tracking-tight text-2xl text-white hover:text-kafunda-bone transition-colors">
                Kafunda
              </span>
            </Link>
            <p className="text-sm text-white/55 mt-3 leading-relaxed max-w-[14rem]">
              Kampala&apos;s premium wines &amp; spirits, delivered.
            </p>
          </div>

          {/* Shop */}
          <div>
            <ColumnHeading>Shop</ColumnHeading>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <ColumnHeading>Help</ColumnHeading>
            <ul className="space-y-2.5">
              {HELP_LINKS.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{l.label}</a>
                  ) : (
                    <Link href={l.href} className={linkClass}>{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <ColumnHeading>Connect</ColumnHeading>
            <ul className="space-y-2.5">
              <li><a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className={linkClass}>Instagram</a></li>
              <li><a href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer" className={linkClass}>X (Twitter)</a></li>
              <li><a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" className={linkClass}>TikTok</a></li>
              <li><a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>WhatsApp</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── 3. Legal bar ──────────────────────────────────────────────────── */}
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-5 text-center">
            <p className="text-[10px] text-white/55 font-medium uppercase tracking-widest">
              &copy; {year} {SITE.name}
            </p>
            <p className="text-[10px] text-white/55 font-medium uppercase tracking-widest">
              18+ only &middot; Drink responsibly
            </p>
          </div>
          <div className="flex items-center gap-5">
            {COMPANY_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-[11px] text-white/70 hover:text-white font-medium transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}