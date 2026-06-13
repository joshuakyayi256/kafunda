"use client";

import React from "react";
import Link from "next/link";
import { CONTACT, SOCIAL, SITE } from "@/lib/constants";

/**
 * Minimal statement footer.
 * Giant typographic wordmark + one slim utility bar. Nothing else.
 */
export default function Footer() {
  return (
    <footer className="bg-kafunda-green-deep text-white pb-28 md:pb-0">

      {/* ── Giant wordmark ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-4 pt-16 pb-10 md:pt-24 md:pb-14 select-none overflow-hidden">
        <Link href="/" aria-label="Kafunda Wines and Spirits — home">
          <span className="block font-heading font-black uppercase tracking-tighter leading-none text-white text-[17vw] md:text-[13vw] whitespace-nowrap hover:text-kafunda-bone transition-colors">
            Kafunda
          </span>
        </Link>
      </div>

      {/* ── Utility bar ────────────────────────────────────────────────── */}
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Left: legal */}
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-5 text-center md:text-left">
            <p className="text-[10px] text-white/55 font-medium uppercase tracking-widest">
              © {new Date().getFullYear()} {SITE.name}
            </p>
            <p className="text-[10px] text-white/55 font-medium uppercase tracking-widest">
              18+ only · Drink responsibly
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