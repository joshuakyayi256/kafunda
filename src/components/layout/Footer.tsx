"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { CONTACT, SOCIAL, SITE } from "@/lib/constants";

/**
 * Footer (June 2026, client revisions).
 *  - App CTA panel: BIGGER, WHITE card, animated text (Framer Motion — already
 *    a project dependency; no GSAP needed). Badges in ORIGINAL colours, as-is.
 *  - Brand description under "Kafunda" uses the client's exact wording.
 *  - Payment chips, Facebook, contact number as before.
 *
 * BADGE FILES in /public/badges/ (official artwork, original colours):
 *   google-play.png   app-store.png
 *   -> if your Google Play file is .jpg, change the src below to .jpg.
 */

const APP_LINKS = {
  ios: "https://apps.apple.com/search?term=kafunda%20winestore",
  android: "https://play.google.com/store/search?q=kafunda%20winestore&c=apps",
};

const SHOP_LINKS = [
  { label: "Beers & Ciders", href: "/shop?category=Beers" },
  { label: "Wines", href: "/shop?category=Wines" },
  { label: "Whiskys", href: "/shop?category=Whiskys" },
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

const STORE_BADGES = [
  { href: APP_LINKS.android, src: "/badges/google-play.png", alt: "Get it on Google Play" },
  { href: APP_LINKS.ios, src: "/badges/app-store.png", alt: "Download on the App Store" },
];

const PAYMENT_LOGOS = [
  { src: "/payments/visa.png", alt: "Visa" },
  { src: "/payments/mastercard.jfif", alt: "Mastercard" },
  { src: "/payments/mtn-momo.jfif", alt: "MTN Mobile Money" },
  { src: "/payments/airtel-money.png", alt: "Airtel Money" },
  { src: "/payments/pesapal.png", alt: "Pesapal" },
];

// Framer Motion variants for the staggered, animate-on-scroll CTA text.
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

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

      {/* ── App CTA panel — BIG white card, animated text ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={containerVariants}
          className="relative overflow-hidden rounded-4xl bg-white shadow-2xl px-7 py-10 md:px-16 md:py-14"
        >
          {/* brand accent wash so the white card still feels Kafunda */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-kafunda-green/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-kafunda-mustard/10 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="text-center lg:text-left max-w-2xl">
              <motion.p
                variants={itemVariants}
                className="text-[11px] font-black uppercase tracking-[0.3em] text-kafunda-green mb-3"
              >
                Mobile App
              </motion.p>
              <motion.h3
                variants={itemVariants}
                className="text-3xl md:text-5xl font-black tracking-tight leading-[1.05] text-kafunda-ink"
              >
                Get the{" "}
                <span className="text-kafunda-green">Kafunda WineStore</span>{" "}
                Mobile App
              </motion.h3>
              <motion.p
                variants={itemVariants}
                className="text-base md:text-lg text-zinc-500 mt-4 leading-relaxed"
              >
                Faster ordering, app-only offers, and 1&ndash;2 hour delivery to your door.
              </motion.p>
            </div>

            {/* Official store badges — original colours, as-is */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-4 shrink-0"
            >
              {STORE_BADGES.map((b) => (
                <a
                  key={b.alt}
                  href={b.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block transition-transform duration-200 hover:scale-[1.05] active:scale-95"
                  aria-label={b.alt}
                >
                  <Image
                    src={b.src}
                    alt={b.alt}
                    width={200}
                    height={60}
                    className="h-14 md:h-16 w-auto object-contain"
                    unoptimized
                  />
                </a>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ── Footer body ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-20 md:pb-14">
        <span
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-x-0 bottom-0 z-0 text-center font-heading font-black uppercase tracking-tighter leading-none text-white/5 text-[26vw] md:text-[20vw] whitespace-nowrap"
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
            <p className="text-sm text-white/70 mt-3 leading-relaxed max-w-xs">
              Kafunda Wine Store &amp; Spirits is dedicated to providing the Highest Quality
              Wines &amp; Spirits. Whether you&apos;re looking for Premium Selections or
              Unbeatable Offers, Kafunda is your go-to destination for the Best deals and
              Finest drinks in the country. Cheers to Great Taste, Great Value, and
              Exceptional Service!
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
                className="bg-white rounded-lg h-11 min-w-15 px-3 flex items-center justify-center shadow-sm"
                title={p.alt}
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={64}
                  height={32}
                  className="h-6 w-auto max-w-13 object-contain"
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