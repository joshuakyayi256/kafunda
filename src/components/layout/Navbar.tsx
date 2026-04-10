"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  ShoppingCart,
  User,
  X,
  MessageCircle,
  Flame,
  Sparkles,
  Home,
  Store,
  Menu,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

const categories = [
  { label: "Wines",     href: "/shop?category=Wines",     emoji: "🍷" },
  { label: "Whisky",    href: "/shop?category=Whisky",    emoji: "🥃" },
  { label: "Gin",       href: "/shop?category=Gin",       emoji: "🍸" },
  { label: "Tequila",   href: "/shop?category=Tequila",   emoji: "🌵" },
  { label: "Beer",      href: "/shop?category=Beers",     emoji: "🍺" },
  { label: "Champagne", href: "/shop?category=Champagne", emoji: "🥂" },
];

const Navbar = () => {
  const { itemsCount } = useCart();
  const pathname = usePathname();

  const [isScrolled,   setIsScrolled]   = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen,   setIsMoreOpen]   = useState(false);
  const [searchValue,  setSearchValue]  = useState("");

  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const overlaySearchRef = useRef<HTMLInputElement>(null);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Focus overlay search when opened
  useEffect(() => {
    if (isSearchOpen) setTimeout(() => overlaySearchRef.current?.focus(), 50);
  }, [isSearchOpen]);

  // Lock body scroll when an overlay is open
  useEffect(() => {
    document.body.style.overflow = (isSearchOpen || isMoreOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isSearchOpen, isMoreOpen]);

  // Close everything on route change
  useEffect(() => {
    return () => {
      setIsSearchOpen(false);
      setIsMoreOpen(false);
    };
  }, [pathname]);

  const closeAll = () => { setIsSearchOpen(false); setIsMoreOpen(false); };

  return (
    <>
      {/* ── Announcement bar ── */}
      <div className="w-full bg-zinc-900 text-white text-[11px] font-medium tracking-wide py-1.5 px-4 text-center">
        ⚡{" "}
        <span className="text-yellow-400 font-bold">1-2 Hour Delivery</span>
        <span className="hidden sm:inline"> · Free shipping over UGX 500,000 · </span>
        <a
          href="https://wa.me/256700000000"
          className="underline underline-offset-2 opacity-80 hover:opacity-100 ml-1 sm:ml-0"
        >
          Order via WhatsApp
        </a>
      </div>

      {/* ── Main navbar ── */}
      <nav
        className={`sticky top-0 z-50 w-full bg-white transition-all duration-300 ${
          isScrolled ? "shadow-[0_2px_20px_rgba(0,0,0,0.08)]" : "border-b border-gray-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 md:h-16 gap-4">

            {/* Logo */}
            <Link
              href="/"
              className="shrink-0 text-[22px] font-black tracking-[-0.04em] text-zinc-900 hover:text-primary-red transition-colors duration-200"
            >
              Ka<span className="text-primary-red">funda</span>
            </Link>

            {/* Desktop search — centred */}
            <div className="hidden md:flex flex-1 max-w-xl mx-auto relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary-red transition-colors" />
              </div>
              <input
                ref={desktopSearchRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full h-10 pl-9 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-xl placeholder:text-gray-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-red/20 focus:border-primary-red transition-all duration-200"
                placeholder="Search wines, whisky, gin…"
              />
              {searchValue && (
                <button
                  onClick={() => setSearchValue("")}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto md:ml-0">

              {/* Desktop: Account */}
              <button
                className="hidden md:flex p-2 rounded-lg text-zinc-600 hover:bg-gray-50 hover:text-zinc-900 transition-colors"
                aria-label="Account"
              >
                <User className="h-5 w-5" />
              </button>

              {/* Desktop: Cart */}
              <Link
                href="/cart"
                className="hidden md:flex relative p-2 rounded-lg text-zinc-600 hover:bg-gray-50 hover:text-zinc-900 transition-colors"
                aria-label={`Cart, ${itemsCount} items`}
              >
                <ShoppingCart className="h-5 w-5" />
                {itemsCount > 0 && (
                  <span className="absolute top-1 right-1 translate-x-1/2 -translate-y-1/2 min-w-4.5 h-4.5 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-primary-red rounded-full ring-2 ring-white leading-none">
                    {itemsCount > 99 ? "99+" : itemsCount}
                  </span>
                )}
              </Link>

              {/* Desktop: WhatsApp CTA */}
              <a
                href="https://wa.me/256700000000"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-150 ml-1 shadow-sm"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Chat to Order</span>
              </a>

              {/* Mobile: Cart badge in top bar */}
              <Link
                href="/cart"
                className="md:hidden relative p-2 rounded-lg text-zinc-600 hover:bg-gray-50 transition-colors"
                aria-label={`Cart, ${itemsCount} items`}
              >
                <ShoppingCart className="h-5 w-5" />
                {itemsCount > 0 && (
                  <span className="absolute top-1 right-1 translate-x-1/2 -translate-y-1/2 min-w-4.5 h-4.5 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-primary-red rounded-full ring-2 ring-white leading-none">
                    {itemsCount > 99 ? "99+" : itemsCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* ── Category sub-nav — desktop only ── */}
        <div className="hidden md:block border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-10">
              <Link
                href="/shop"
                className="flex items-center gap-1.5 px-4 h-full text-[11px] font-bold uppercase tracking-widest text-white bg-primary-red hover:bg-primary-red-hover transition-colors shrink-0"
              >
                <Flame className="h-3 w-3" />
                All Products
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="flex items-center gap-1.5 px-4 h-full text-[11px] font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 hover:bg-gray-50 transition-colors border-b-2 border-transparent hover:border-primary-red shrink-0"
                >
                  <span className="text-sm leading-none">{cat.emoji}</span>
                  {cat.label}
                </Link>
              ))}
              <Link
                href="/shop?filter=offers"
                className="flex items-center gap-1.5 px-4 h-full text-[11px] font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors ml-auto border-b-2 border-transparent hover:border-amber-500 shrink-0"
              >
                <Sparkles className="h-3 w-3" />
                Today&apos;s Offers
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════
          MOBILE ONLY — bottom tab bar
      ════════════════════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100">
        <div className="flex items-stretch h-16">
          <Link
            href="/"
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              pathname === "/" ? "text-primary-red" : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          <Link
            href="/shop"
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              pathname === "/shop" ? "text-primary-red" : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <Store className="h-5 w-5" />
            <span>Shop</span>
          </Link>

          <button
            onClick={() => { setIsSearchOpen(true); setIsMoreOpen(false); }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isSearchOpen ? "text-primary-red" : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <Search className="h-5 w-5" />
            <span>Search</span>
          </button>

          <Link
            href="/cart"
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider relative transition-colors ${
              pathname === "/cart" ? "text-primary-red" : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemsCount > 0 && (
                <span className="absolute -top-1 -right-2.5 min-w-4 h-4 px-0.5 flex items-center justify-center text-[9px] font-bold text-white bg-primary-red rounded-full leading-none">
                  {itemsCount > 99 ? "99+" : itemsCount}
                </span>
              )}
            </div>
            <span>Cart</span>
          </Link>

          <button
            onClick={() => { setIsMoreOpen(!isMoreOpen); setIsSearchOpen(false); }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isMoreOpen ? "text-primary-red" : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <Menu className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* ════════════════════════════════════
          Search overlay (mobile + desktop)
      ════════════════════════════════════ */}
      <div
        className={`fixed inset-0 z-70 transition-all duration-300 ${
          isSearchOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSearchOpen(false)}
        />
        {/* Panel */}
        <div
          className={`relative bg-white w-full shadow-xl transition-transform duration-300 ${
            isSearchOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={overlaySearchRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full h-12 pl-12 pr-4 text-base bg-gray-50 border border-gray-200 rounded-2xl placeholder:text-gray-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-red/20 focus:border-primary-red transition-all"
                placeholder="Search wines, whisky, gin…"
              />
            </div>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="shrink-0 p-2 rounded-xl text-zinc-500 hover:bg-gray-100 hover:text-zinc-900 transition-colors"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          "More" bottom sheet — mobile only
      ════════════════════════════════════ */}
      <div
        className={`fixed inset-0 z-60 md:hidden transition-opacity duration-300 ${
          isMoreOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMoreOpen(false)}
      />
      <div
        className={`fixed bottom-16 left-0 right-0 z-61 md:hidden bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          isMoreOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pt-1 pb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-4">
            Browse Categories
          </p>

          {/* 3-column category grid */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {categories.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                onClick={closeAll}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all text-center"
              >
                <span className="text-2xl leading-none">{cat.emoji}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 leading-tight">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Offers strip */}
          <Link
            href="/shop?filter=offers"
            onClick={closeAll}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-amber-50 text-amber-600 text-sm font-bold uppercase tracking-widest mb-3 hover:bg-amber-100 active:scale-[0.98] transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Today&apos;s Offers
          </Link>

          {/* WhatsApp CTA */}
          <a
            href="https://wa.me/256700000000"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeAll}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-sm font-bold uppercase tracking-widest transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            Order via WhatsApp
          </a>
        </div>
      </div>
    </>
  );
};

export default Navbar;
