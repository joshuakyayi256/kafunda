"use client";

import React from "react";
import Link from "next/link";
import { Apple, Play } from "lucide-react";
import { CONTACT, SOCIAL, SITE } from "@/lib/constants";

/**
 * Footer (June 2026) - minimal statement footer + app-download promo.
 * Keeps the giant wordmark, but adds a refined "Get the app" band above it
 * (the old site advertised the app; this does it cleaner, on-brand green).
 *
 * App store links live in constants (APP_LINKS); update there when the
 * Kafunda-owned listings are confirmed. Until then they point to search.
 */

const APP_LINKS = {
  ios: "https://apps.apple.com/search?term=kafunda%20winestore",
  android: "https://play.google.com/store/search?q=kafunda%20winestore&c=apps",
};

function StoreButton({
  href, top, bottom, Icon,
}: { href: string; top: string; bottom: string; Icon: React.ElementType }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-white text-kafunda-ink rounded-xl px-5 py-2.5 hover:bg-kafunda-bone transition-colors"
    >
      <Icon className="h-6 w-6 shrink-0" />
      <span className="flex flex-col leading-none text-left">
        <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">{top}</span>
        <span className="text-sm font-black">{bottom}</span>
      </span>
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="bg-kafunda-green-deep text-white pb-28 md:pb-0">

      {/* App-download promo band */}
      <div className="border-b border-white/15 bg-kafunda-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl md:text-2xl font-black tracking-tight">
              Get the <span className="text-kafunda-mustard">Kafunda</span> app
            </h3>
            <p className="text-sm text-white/60 mt-1">
              Faster ordering, exclusive app-only offers, and 1-2 hour delivery.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <StoreButton href={APP_LINKS.android} top="Get it on" bottom="Google Play" Icon={Play} />
            <StoreButton href={APP_LINKS.ios} top="Download on the" bottom="App Store" Icon={Apple} />
          </div>
        </div>
      </div>

      {/* Giant wordmark */}
      <div className="flex items-center justify-center px-4 pt-14 pb-10 md:pt-20 md:pb-14 select-none overflow-hidden">
        <Link href="/" aria-label="Kafunda Wines and Spirits - home">
          <span className="block font-heading font-black uppercase tracking-tighter leading-none text-white text-[17vw] md:text-[13vw] whitespace-nowrap hover:text-kafunda-bone transition-colors">
            Kafunda
          </span>
        </Link>
      </div>

      {/* Utility bar */}
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Left: legal */}
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-5 text-center md:text-left">
            <p className="text-[10px] text-white/55 font-medium uppercase tracking-widest">
              &copy; {new Date().getFullYear()} {SITE.name}
            </p>
            <p className="text-[10px] text-white/55 font-medium uppercase tracking-widest">
              18+ only &middot; Drink responsibly
            </p>
          </div>

          {/* Center: links */}
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="text-[11px] text-white/70 hover:text-white font-medium transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-[11px] text-white/70 hover:text-white font-medium transition-colors">
              Terms
            </Link>
            <Link href="/delivery" className="text-[11px] text-white/70 hover:text-white font-medium transition-colors">
              Delivery
            </Link>
          </div>

          {/* Right: follow */}
          <div className="flex items-center gap-4">
            <span className="text-[16px] text-white/55 font-medium">Follow:</span>
            <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer"
               className="text-[16px] text-white/70 hover:text-white font-medium transition-colors">
              Instagram
            </a>
            <a href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer"
               className="text-[16px] text-white/70 hover:text-white font-medium transition-colors">
              X
            </a>
            <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer"
               className="text-[16px] text-white/70 hover:text-white font-medium transition-colors">
              TikTok
            </a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer"
               className="text-[16px] text-white/70 hover:text-white font-medium transition-colors">
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}