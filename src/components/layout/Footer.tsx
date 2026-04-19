"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Phone, MessageCircle, ExternalLink, ShieldCheck, ShoppingBag, ChevronDown } from "lucide-react";
import { CONTACT, SOCIAL, SITE, DELIVERY, CATEGORIES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TwitterXIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.93a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" />
  </svg>
);

// Helper for mobile accordion sections
function FooterLinkSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-zinc-900/50 lg:border-none py-6 lg:py-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full lg:hidden group"
      >
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-zinc-400 transition-colors flex items-center gap-2">
          <div className="w-4 h-px bg-zinc-800 group-hover:bg-primary-red transition-colors" /> {title}
        </h4>
        <div className={`w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center transition-all ${isOpen ? "rotate-180 border-primary-red" : ""}`}>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 ${isOpen ? "text-primary-red" : ""}`} />
        </div>
      </button>

      {/* Desktop Heading */}
      <h4 className="hidden lg:flex text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-8 items-center gap-2">
        <div className="w-4 h-px bg-zinc-800" /> {title}
      </h4>

      <div className="hidden lg:block">
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden overflow-hidden"
          >
            <div className="pt-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="bg-zinc-950 text-white pt-24 pb-12 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-125 h-125 bg-primary-red/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Section: Newsletter & Brand */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 mb-20">
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
            <Link href="/" className="flex items-center gap-3 mb-8 group">
              <div className="w-12 h-12 bg-primary-red flex items-center justify-center rounded-xl rotate-0 group-hover:rotate-12 transition-transform duration-500">
                <span className="text-white font-black text-2xl italic">K</span>
              </div>
              <div>
                <span className="text-2xl font-black tracking-tighter uppercase italic block leading-none">Kafunda</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Wine Store & Spirits</span>
              </div>
            </Link>
            <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-8 max-w-md">
              Elevating Uganda&apos;s drinking culture with curated spirits, expert selection, and <span className="text-white font-bold">lightning-fast delivery</span>.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-primary-red hover:text-white hover:border-primary-red transition-all duration-300">
                <InstagramIcon />
              </a>
              <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-primary-red hover:text-white hover:border-primary-red transition-all duration-300">
                <FacebookIcon />
              </a>
              <a href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-primary-red hover:text-white hover:border-primary-red transition-all duration-300">
                <TwitterXIcon />
              </a>
              <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-primary-red hover:text-white hover:border-primary-red transition-all duration-300">
                <TikTokIcon />
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-4xl p-6 sm:p-8 md:p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-red/10 blur-3xl transform translate-x-10 -translate-y-10 group-hover:bg-primary-red/20 transition-colors" />

              <div className="relative z-10">
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter mb-4">
                  Join the <span className="text-primary-red">Connoisseur&apos;s</span> List
                </h3>
                <p className="text-zinc-500 text-xs sm:text-sm md:text-base font-medium mb-8 max-w-md">
                  Get exclusive access to vintage drops, limited editions, and invitation-only tasting events.
                </p>

                {subscribed ? (
                  <div className="h-16 flex items-center gap-3 text-emerald-400 font-bold uppercase tracking-widest bg-emerald-400/10 border border-emerald-400/20 px-6 rounded-2xl animate-in fade-in zoom-in duration-500 text-sm">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span>Welcome to the club</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="flex-1 h-14 md:h-16 px-6 bg-zinc-950 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-red focus:ring-4 focus:ring-primary-red/10 transition-all font-medium text-sm"
                    />
                    <button
                      type="submit"
                      className="h-14 md:h-16 px-8 bg-white hover:bg-primary-red text-black hover:text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-300 group shadow-lg shadow-white/5 active:scale-95 shrink-0"
                    >
                      Subscribe
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Links Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-2 lg:gap-y-12 gap-x-8 mb-20 lg:border-t lg:border-zinc-900/50 lg:pt-20">
          {/* Shop Categories */}
          <div className="lg:col-span-4">
            <FooterLinkSection title="Catalog">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {CATEGORIES.map((cat) => (
                  <Link key={cat} href={`/shop?category=${cat}`} className="text-zinc-400 hover:text-white transition-colors text-sm font-medium flex items-center group">
                    <div className="w-0 group-hover:w-2 h-px bg-primary-red mr-0 group-hover:mr-2 transition-all" />
                    {cat}
                  </Link>
                ))}
              </div>
            </FooterLinkSection>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <FooterLinkSection title="Explore">
              <div className="flex flex-col gap-4">
                {["Home", "Shop", "About Us", "Delivery Info", "Contact Us"].map((link) => (
                  <Link
                    key={link}
                    href={link === "Home" ? "/" : `/${link.toLowerCase().replace(" ", "-")}`}
                    className="text-zinc-400 hover:text-white transition-colors text-sm font-medium group flex items-center"
                  >
                    <div className="w-0 group-hover:w-2 h-px bg-primary-red mr-0 group-hover:mr-2 transition-all" />
                    {link}
                  </Link>
                ))}
              </div>
            </FooterLinkSection>
          </div>

          {/* Support */}
          <div className="lg:col-span-2">
            <FooterLinkSection title="Support">
              <div className="flex flex-col gap-4">
                {["Privacy Policy", "Terms & Conditions", "FAQs", "Return Policy"].map((link) => (
                  <Link
                    key={link}
                    href={`/${link.toLowerCase().replace(" & ", "-").replace(" ", "-").replace("policy", "")}`}
                    className="text-zinc-400 hover:text-white transition-colors text-sm font-medium group flex items-center"
                  >
                    <div className="w-0 group-hover:w-2 h-px bg-primary-red mr-0 group-hover:mr-2 transition-all" />
                    {link}
                  </Link>
                ))}
              </div>
            </FooterLinkSection>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-4 pt-10 lg:pt-0">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-8 flex items-center gap-2">
              <div className="w-4 h-px bg-zinc-800" /> Get In Touch
            </h4>
            <div className="flex flex-col gap-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary-red" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">{CONTACT.phone}</p>
                  <p className="text-zinc-500 text-[10px] font-medium">{CONTACT.hours.weekday}</p>
                  <p className="text-zinc-500 text-[10px] font-medium">{CONTACT.hours.weekend}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-900/40 border border-emerald-800/40 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="text-white font-bold text-sm hover:text-emerald-400 transition-colors block mb-1">
                    WhatsApp Us
                  </a>
                  <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Fastest reply · Usually within minutes</p>
                </div>
              </div>
            </div>

            <a
              href="https://glovoapp.com/ug/en/kampala/kafunda-wine-spirits-kla/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 bg-zinc-900/40 rounded-3xl p-6 border border-zinc-900/60 flex items-center justify-between group cursor-pointer hover:bg-zinc-900/60 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-[#FF6B00]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Order on Glovo</p>
                  <p className="text-xs font-black text-white uppercase italic">{DELIVERY.recommendation}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-700 group-hover:text-white transition-colors" />
            </a>
          </div>
        </div>

        {/* Bottom Section: Copyright & Info */}
        <div className="pt-12 border-t border-zinc-900 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center lg:items-start gap-2 text-center lg:text-left">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              © {new Date().getFullYear()} {SITE.name}. Crafted for the bold.
            </p>
            <p className="text-[9px] text-zinc-700 font-medium uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" /> Alcohol consumption is injurious to health. Not for sale to minors under 18.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {["Cash on Delivery", "MTN MoMo", "Airtel Money", "Visa / Card"].map((method) => (
              <span key={method} className="px-4 py-2 bg-zinc-900 border border-zinc-800/50 rounded-lg text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-full text-center select-none pointer-events-none opacity-[0.02]">
        <span className="text-[25vw] font-black text-white italic tracking-tighter uppercase">Kafunda</span>
      </div>
    </footer>
  );
}
