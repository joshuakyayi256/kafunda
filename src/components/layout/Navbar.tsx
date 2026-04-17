"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, ShoppingCart, X, MessageCircle,
  Flame, Sparkles, Home, Store, Menu,
  Zap, ArrowRight, User,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

// ─── Config ───────────────────────────────────────────────────────────────────

const SALE_END = new Date("2026-04-30T23:59:59");

const TICKER = [
  { emoji: "⚡", text: "1–2 Hour Delivery across Kampala" },
  { emoji: "🚚", text: "Free Delivery on orders over UGX 500,000" },
  { emoji: "💬", text: "Order directly via WhatsApp: +256 700 000 000" },
];

const CATEGORIES = [
  { label: "Wines",     href: "/shop?category=Wines",     emoji: "🍷" },
  { label: "Whisky",    href: "/shop?category=Whisky",    emoji: "🥃" },
  { label: "Gin",       href: "/shop?category=Gin",       emoji: "🍸" },
  { label: "Tequila",   href: "/shop?category=Tequila",   emoji: "🌵" },
  { label: "Beer",      href: "/shop?category=Beers",     emoji: "🍺" },
  { label: "Champagne", href: "/shop?category=Champagne", emoji: "🥂" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, "0"); }

function getTimeLeft(end: Date) {
  const diff = Math.max(0, end.getTime() - Date.now());
  return {
    h: Math.floor(diff / 1000 / 60 / 60),
    m: Math.floor((diff / 1000 / 60) % 60),
    s: Math.floor((diff / 1000) % 60),
    expired: diff === 0,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Compact countdown used inside the sub-nav strip */
function InlineCountdown() {
  const [time, setTime] = useState(getTimeLeft(SALE_END));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const id = setInterval(() => setTime(getTimeLeft(SALE_END)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!ready || time.expired) return null;

  return (
    <div className="flex items-center gap-3 shrink-0 ml-auto pl-4 border-l border-zinc-800/60">
      {/* Label */}
      <div className="hidden sm:flex items-center gap-1.5">
        <Zap className="h-3 w-3 text-primary-red fill-primary-red" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
          Flash Sale
        </span>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-0.5 font-black tabular-nums text-white text-sm">
        <span className="bg-zinc-800 rounded px-1.5 py-0.5">{pad(time.h)}</span>
        <span className="text-primary-red text-xs animate-pulse">:</span>
        <span className="bg-zinc-800 rounded px-1.5 py-0.5">{pad(time.m)}</span>
        <span className="text-primary-red text-xs animate-pulse">:</span>
        <span className="bg-zinc-800 rounded px-1.5 py-0.5">{pad(time.s)}</span>
      </div>

      {/* CTA */}
      <Link
        href="/shop?filter=offers"
        className="hidden sm:flex items-center gap-1 bg-primary-red hover:bg-primary-red-hover text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors"
      >
        Shop Deals
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

/** Rotating announcement ticker */
function AnnouncementBar() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % TICKER.length), 4000);
    return () => clearInterval(id);
  }, []);

  const msg = TICKER[idx];

  return (
    <div className="w-full bg-zinc-950 text-white py-2 px-4 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-center gap-2 text-[11px] font-medium tracking-wide"
        >
          <span>{msg.emoji}</span>
          <span className="text-zinc-300">{msg.text}</span>
          <a
            href="https://wa.me/256785498279"
            className="text-emerald-400 font-bold hover:text-emerald-300 underline underline-offset-2 transition-colors ml-1"
          >
            Order Now →
          </a>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Navbar = () => {
  const { itemsCount } = useCart();
  const pathname  = usePathname();
  const router    = useRouter();

  const [isScrolled,   setIsScrolled]   = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen,   setIsMoreOpen]   = useState(false);
  const [searchValue,  setSearchValue]  = useState("");

  const overlaySearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen) setTimeout(() => overlaySearchRef.current?.focus(), 60);
  }, [isSearchOpen]);

  useEffect(() => {
    document.body.style.overflow = (isSearchOpen || isMoreOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isSearchOpen, isMoreOpen]);

  useEffect(() => {
    setIsSearchOpen(false);
    setIsMoreOpen(false);
  }, [pathname]);

  const closeAll = () => { setIsSearchOpen(false); setIsMoreOpen(false); };

  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    closeAll();
    setSearchValue("");
    router.push(`/shop?search=${encodeURIComponent(q)}`);
  };

  return (
    <>
      {/* ══════════════════════════ ANNOUNCEMENT BAR ══════════════════════════ */}
      <AnnouncementBar />

      {/* ═══════════════════════════ STICKY HEADER ════════════════════════════ */}
      <header
        className={`sticky top-0 z-50 w-full bg-white transition-all duration-300 ${
          isScrolled
            ? "shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
            : "border-b border-gray-100"
        }`}
      >
        {/* ── Main row ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-3">

            {/* Logo */}
            <Link
              href="/"
              className="shrink-0 flex items-center gap-2 group"
            >
              <div className="w-8 h-8 bg-primary-red rounded-lg flex items-center justify-center shadow-sm group-hover:bg-primary-red-hover transition-colors">
                <span className="text-white font-black text-sm leading-none">K</span>
              </div>
              <span className="text-xl font-black tracking-[-0.04em] text-zinc-900 group-hover:text-primary-red transition-colors hidden sm:block">
                Ka<span className="text-primary-red">funda</span>
              </span>
            </Link>

            {/* Search — desktop */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-2xl mx-auto relative"
            >
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search wines, whisky, gin, champagne…"
                className="w-full h-11 pl-10 pr-10 text-sm bg-gray-50 border-2 border-gray-100 rounded-2xl placeholder:text-gray-400 text-zinc-900 focus:outline-none focus:border-primary-red focus:bg-white transition-all duration-200"
              />
              {searchValue ? (
                <button
                  type="button"
                  onClick={() => setSearchValue("")}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-zinc-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    ↵
                  </kbd>
                </div>
              )}
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto md:ml-0">

              {/* Mobile: search trigger */}
              <button
                onClick={() => { setIsSearchOpen(true); setIsMoreOpen(false); }}
                className="md:hidden p-2.5 rounded-xl text-zinc-500 hover:bg-gray-50 hover:text-zinc-900 transition-colors"
                aria-label="Open search"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Desktop: account */}
              <button
                className="hidden md:flex p-2.5 rounded-xl text-zinc-500 hover:bg-gray-50 hover:text-zinc-900 transition-colors"
                aria-label="My Account"
              >
                <User className="h-5 w-5" />
              </button>

              {/* Cart — all screens */}
              <Link
                href="/cart"
                className="relative p-2.5 rounded-xl text-zinc-500 hover:bg-gray-50 hover:text-zinc-900 transition-colors"
                aria-label={`Cart — ${itemsCount} items`}
              >
                <ShoppingCart className="h-5 w-5" />
                <AnimatePresence>
                  {itemsCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-1.5 right-1.5 translate-x-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[9px] font-black text-white bg-primary-red rounded-full ring-2 ring-white leading-none"
                    >
                      {itemsCount > 99 ? "99+" : itemsCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* WhatsApp CTA — desktop */}
              <a
                href="https://wa.me/256785498279"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ml-1 shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                Order on WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* ── Category sub-nav strip ── */}
        <div className="bg-zinc-900 border-t border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-11 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">

              {/* All Products */}
              <Link
                href="/shop"
                className="flex items-center gap-1.5 px-4 h-full text-[11px] font-black uppercase tracking-widest text-white bg-primary-red hover:bg-primary-red-hover transition-colors shrink-0"
              >
                <Flame className="h-3 w-3" />
                All Products
              </Link>

              {/* Category links */}
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="flex items-center gap-1.5 px-4 h-full text-[11px] font-semibold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border-b-2 border-transparent hover:border-primary-red shrink-0"
                >
                  <span className="text-sm leading-none">{cat.emoji}</span>
                  {cat.label}
                </Link>
              ))}

              {/* Offers */}
              <Link
                href="/shop?filter=offers"
                className="flex items-center gap-1.5 px-4 h-full text-[11px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors border-b-2 border-transparent hover:border-amber-400 shrink-0"
              >
                <Sparkles className="h-3 w-3" />
                Today&apos;s Offers
              </Link>

              {/* Inline countdown — pushed to right */}
              <InlineCountdown />
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════ MOBILE BOTTOM TAB BAR ════════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 safe-area-inset-bottom">
        <div className="flex items-stretch h-16">
          {[
            { href: "/",      label: "Home",  Icon: Home,         exact: true  },
            { href: "/shop",  label: "Shop",  Icon: Store,        exact: true  },
          ].map(({ href, label, Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  active ? "text-primary-red" : "text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                {label}
              </Link>
            );
          })}

          {/* Search */}
          <button
            onClick={() => { setIsSearchOpen(true); setIsMoreOpen(false); }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              isSearchOpen ? "text-primary-red" : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <Search className={`h-5 w-5 ${isSearchOpen ? "stroke-[2.5]" : ""}`} />
            Search
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide relative transition-colors ${
              pathname === "/cart" ? "text-primary-red" : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <div className="relative">
              <ShoppingCart className={`h-5 w-5 ${pathname === "/cart" ? "stroke-[2.5]" : ""}`} />
              {itemsCount > 0 && (
                <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center text-[9px] font-black text-white bg-primary-red rounded-full leading-none">
                  {itemsCount > 99 ? "99+" : itemsCount}
                </span>
              )}
            </div>
            Cart
          </Link>

          {/* More */}
          <button
            onClick={() => { setIsMoreOpen(!isMoreOpen); setIsSearchOpen(false); }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              isMoreOpen ? "text-primary-red" : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <Menu className={`h-5 w-5 ${isMoreOpen ? "stroke-[2.5]" : ""}`} />
            More
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════ SEARCH OVERLAY ═══════════════════════════ */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              key="search-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsSearchOpen(false)}
            />
            <motion.div
              key="search-panel"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              className="fixed top-0 left-0 right-0 z-61 bg-white shadow-2xl border-b border-gray-100"
            >
              <form onSubmit={handleSearch} className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    ref={overlaySearchRef}
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search wines, whisky, gin, champagne…"
                    className="w-full h-12 pl-12 pr-4 text-base bg-gray-50 border-2 border-gray-100 rounded-2xl placeholder:text-gray-400 text-zinc-900 focus:outline-none focus:border-primary-red focus:bg-white transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="shrink-0 p-2.5 rounded-xl text-zinc-500 hover:bg-gray-100 hover:text-zinc-900 transition-colors"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" />
                </button>
              </form>

              {/* Quick category links */}
              <div className="max-w-3xl mx-auto px-4 pb-4 flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.label}
                    href={cat.href}
                    onClick={closeAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
                  >
                    <span>{cat.emoji}</span>
                    {cat.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════ MOBILE "MORE" BOTTOM SHEET ═══════════════════ */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 md:hidden"
              onClick={() => setIsMoreOpen(false)}
            />
            <motion.div
              key="more-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed bottom-16 left-0 right-0 z-51 md:hidden bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="px-5 pt-2 pb-8 space-y-5">
                {/* Categories */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">
                    Browse Categories
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {CATEGORIES.map((cat) => (
                      <Link
                        key={cat.label}
                        href={cat.href}
                        onClick={closeAll}
                        className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all text-center border border-gray-100"
                      >
                        <span className="text-2xl leading-none">{cat.emoji}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-700 leading-tight">
                          {cat.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Quick links */}
                <div className="space-y-2">
                  <Link
                    href="/shop?filter=offers"
                    onClick={closeAll}
                    className="flex items-center justify-between w-full py-3.5 px-4 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-[0.98] transition-all border border-amber-100"
                  >
                    <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest">
                      <Sparkles className="h-4 w-4" />
                      Today&apos;s Offers
                    </div>
                    <span className="text-xs text-amber-500">→</span>
                  </Link>

                  <Link
                    href="/about"
                    onClick={closeAll}
                    className="flex items-center justify-between w-full py-3.5 px-4 rounded-2xl bg-gray-50 text-zinc-700 hover:bg-gray-100 active:scale-[0.98] transition-all border border-gray-100"
                  >
                    <span className="font-semibold text-sm">About Us</span>
                    <span className="text-xs text-zinc-400">→</span>
                  </Link>

                  <Link
                    href="/delivery"
                    onClick={closeAll}
                    className="flex items-center justify-between w-full py-3.5 px-4 rounded-2xl bg-gray-50 text-zinc-700 hover:bg-gray-100 active:scale-[0.98] transition-all border border-gray-100"
                  >
                    <span className="font-semibold text-sm">Delivery Policy</span>
                    <span className="text-xs text-zinc-400">→</span>
                  </Link>

                  <Link
                    href="/contact"
                    onClick={closeAll}
                    className="flex items-center justify-between w-full py-3.5 px-4 rounded-2xl bg-gray-50 text-zinc-700 hover:bg-gray-100 active:scale-[0.98] transition-all border border-gray-100"
                  >
                    <span className="font-semibold text-sm">Contact Us</span>
                    <span className="text-xs text-zinc-400">→</span>
                  </Link>
                </div>

                {/* WhatsApp CTA */}
                <a
                  href="https://wa.me/256785498279"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeAll}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold uppercase tracking-widest text-sm transition-all shadow-md"
                >
                  <MessageCircle className="h-4 w-4" />
                  Order via WhatsApp
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
