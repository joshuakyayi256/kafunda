"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CONTACT, SOCIAL, SITE } from "@/lib/constants";

/**
 * Footer (June 2026, client revisions).
 *  - Store badges: official Google Play + App Store images, matched heights,
 *    each on its own clean container so colours stay correct on the green panel.
 *  - Payment methods: each logo in a uniform white "chip" with even padding,
 *    flexible width + fixed height so different aspect ratios all look tidy.
 *  - Facebook added; "Contact us" shows the real WhatsApp number.
 *  - Greens flow from theme tokens (#228f22).
 *
 * IMAGE FILES required in /public (exact names/extensions):
 *   /public/badges/google-play.jpg     (3840x2160, white bg)
 *   /public/badges/app-store.png       (738x219, transparent)
 *   /public/payments/visa.png          (320x320)
 *   /public/payments/mastercard.jfif   (574x348)
 *   /public/payments/mtn-momo.jfif     (576x270)
 *   /public/payments/airtel-money.png  (308x163)
 *   /public/payments/pesapal.png       (500x180)
 *
 * APP_LINKS: replace the search URLs with the real listing URLs once live.
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
  { label: "Contact us: 0785 498279", href: "https://wa.me/256785498279", external: true },
];

const COMPANY_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

// Official store badges. Each badge keeps its own background (Play = white card,
// App Store = its native black) so the brand colours render correctly.
const STORE_BADGES = [
  {
    href: APP_LINKS.android,
    src: "/badges/google-play.jpg",
    alt: "Get it on Google Play",
    // white-bg jpg -> wrap in a white rounded card
    wrap: "bg-white",
  },
  {
    href: APP_LINKS.ios,
    src: "/badges/app-store.png",
    alt: "Download on the App Store",
    // transparent png with its own black pill -> no extra bg needed
    wrap: "bg-transparent",
  },
];

// Accepted payment methods. width:auto + fixed height keeps every logo crisp
// regardless of its native aspect ratio.
const PAYMENT_LOGOS = [
  { src: "/payments/visa.png", alt: "Visa" },
  { src: "/payments/mastercard.jfif", alt: "Mastercard" },
  { src: "/payments/mtn-momo.jfif", alt: "MTN Mobile Money" },
  { src: "/payments/airtel-money.png", alt: "Airtel Money" },
  { src: "/payments/pesapal.png", alt: "Pesapal" },
];

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-kafunda-mustard mb-4">
      {children}
    </h4>
  );
}

const linkClass = "text-sm text-white/70 hover:text-white transition-colors";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-kafunda-green-deep text-white pb-28 md:pb-0">

      {/* ── App CTA panel ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16">
        <div className="relative overflow-hidden rounded-3xl bg-kafunda-green border border-white/10 px-6 py-8 md:px-10 md:py-9 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-kafunda-mustard/10 blur-2xl" />
          <div className="relative text-center md:text-left">
            <h3 className="text-xl md:text-2xl font-black tracking-tight">
              Get the <span className="text-kafunda-mustard">Kafunda</span> app
            </h3>
            <p className="text-sm text-white/80 mt-1.5 max-w-md">
              Faster ordering, app-only offers, and 1&ndash;2 hour delivery to your door.
            </p>
          </div>
          {/* Official store badges — matched heights */}
          <div className="relative flex flex-wrap items-center justify-center gap-3 shrink-0">
            {STORE_BADGES.map((b) => (
              <a
                key={b.alt}
                href={b.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center rounded-xl overflow-hidden h-12 px-1 hover:opacity-90 transition-opacity ${b.wrap}`}
              >
                <Image
                  src={b.src}
                  alt={b.alt}
                  width={180}
                  height={54}
                  className="h-10 w-auto object-contain"
                  unoptimized
                />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer body ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-20 md:pb-14">
        <span
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-x-0 bottom-0 z-0 text-center font-heading font-black uppercase tracking-tighter leading-none text-white/[0.05] text-[26vw] md:text-[20vw] whitespace-nowrap"
        >
          Kafunda
        </span>

        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label={`${SITE.name} - home`} className="inline-block">
              <span className="font-heading font-black uppercase tracking-tight text-2xl text-white hover:text-kafunda-bone transition-colors">
                Kafunda
              </span>
            </Link>
            <p className="text-sm text-white/60 mt-3 leading-relaxed max-w-[15rem]">
              Kampala&apos;s most trusted name in premium wines &amp; spirits — handpicked bottles,
              honest prices, and cold delivery to your door in 1&ndash;2 hours.
            </p>
          </div>

          <div>
            <ColumnHeading>Shop</ColumnHeading>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map((l) => (
                <li key={l.href}><Link href={l.href} className={linkClass}>{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <ColumnHeading>Help</ColumnHeading>
            <ul className="space-y-2.5">
              {HELP_LINKS.map((l) => (
                <li key={l.label}>
                  {l.external
                    ? <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{l.label}</a>
                    : <Link href={l.href} className={linkClass}>{l.label}</Link>}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColumnHeading>Connect</ColumnHeading>
            <ul className="space-y-2.5">
              <li><a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" className={linkClass}>Facebook</a></li>
              <li><a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className={linkClass}>Instagram</a></li>
              <li><a href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer" className={linkClass}>X (Twitter)</a></li>
              <li><a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" className={linkClass}>TikTok</a></li>
              <li><a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>WhatsApp</a></li>
            </ul>
          </div>
        </div>

        {/* ── Accepted payment methods (uniform white chips) ── */}
        <div className="relative z-10 mt-12 pt-8 border-t border-white/10">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.25em] mb-4 text-center md:text-left">
            We Accept
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            {PAYMENT_LOGOS.map((p) => (
              <div
                key={p.alt}
                className="bg-white rounded-lg h-11 min-w-[60px] px-3 flex items-center justify-center shadow-sm"
                title={p.alt}
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={64}
                  height={32}
                  className="h-6 w-auto max-w-[52px] object-contain"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Legal bar ── */}
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