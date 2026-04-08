"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  MessageCircle,
  Flame,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

const categories = [
  { label: "Wines", href: "/shop?category=Wines", emoji: "🍷" },
  { label: "Whisky", href: "/shop?category=Whisky", emoji: "🥃" },
  { label: "Gin", href: "/shop?category=Gin", emoji: "🍸" },
  { label: "Tequila", href: "/shop?category=Tequila", emoji: "🌵" },
  { label: "Beer", href: "/shop?category=Beers", emoji: "🍺" },
  { label: "Champagne", href: "/shop?category=Champagne", emoji: "🥂" },
];

const Navbar = () => {
  const { itemsCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Scroll shadow effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  // Close menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  return (
    <>
      {/* ── Top announcement bar ── */}
      <div className="w-full bg-zinc-900 text-white text-[11px] font-medium tracking-wide py-2 px-4 text-center hidden sm:block">
        ⚡ <span className="text-yellow-400 font-bold">1-2 Hour Delivery</span>
        {" within Kampala · Free shipping on orders over UGX 500,000 · "}
        <a href="https://wa.me/256700000000" className="underline underline-offset-2 opacity-80 hover:opacity-100">
          Order via WhatsApp
        </a>
      </div>

      {/* ── Main navbar ── */}
      <nav
        className={`sticky top-0 z-50 w-full bg-white transition-shadow duration-300 ${
          isScrolled ? "shadow-[0_2px_20px_rgba(0,0,0,0.08)]" : "border-b border-gray-100"
        }`}
      >
        {/* ── Primary row ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">

            {/* Logo */}
            <Link
              href="/"
              className="shrink-0 text-[22px] font-black tracking-[-0.04em] text-zinc-900 hover:text-primary-red transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Ka<span className="text-primary-red">funda</span>
            </Link>

            {/* Desktop search — center */}
            <div className="hidden md:flex flex-1 max-w-xl mx-auto relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary-red transition-colors" />
              </div>
              <input
                ref={searchRef}
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

              {/* Mobile: search toggle */}
              <button
                className="md:hidden p-2 rounded-lg text-zinc-600 hover:bg-gray-50 hover:text-zinc-900 transition-colors"
                onClick={() => { setIsSearchOpen(!isSearchOpen); setIsMenuOpen(false); }}
                aria-label="Toggle search"
              >
                {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </button>

              {/* User */}
              <button className="hidden md:flex p-2 rounded-lg text-zinc-600 hover:bg-gray-50 hover:text-zinc-900 transition-colors" aria-label="Account">
                <User className="h-5 w-5" />
              </button>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-2 rounded-lg text-zinc-600 hover:bg-gray-50 hover:text-zinc-900 transition-colors"
                aria-label={`Cart, ${itemsCount} items`}
              >
                <ShoppingCart className="h-5 w-5" />
                {itemsCount > 0 && (
                  <span className="absolute top-1 right-1 translate-x-1/2 -translate-y-1/2 min-w-4.5 h-4.5 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-primary-red rounded-full shadow-sm ring-2 ring-white leading-none">
                    {itemsCount > 99 ? "99+" : itemsCount}
                  </span>
                )}
              </Link>

              {/* WhatsApp CTA — desktop */}
              <a
                href="https://wa.me/256700000000"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-150 ml-1 shadow-sm"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Chat to Order</span>
              </a>

              {/* Mobile: hamburger */}
              <button
                className="md:hidden p-2 rounded-lg text-zinc-600 hover:bg-gray-50 hover:text-zinc-900 transition-colors"
                onClick={() => { setIsMenuOpen(!isMenuOpen); setIsSearchOpen(false); }}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Category nav row — desktop ── */}
        <div className="hidden md:block border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-0 h-10">
              <Link
                href="/shop"
                className="flex items-center gap-1.5 px-4 h-full text-[11px] font-bold uppercase tracking-widest text-white bg-primary-red hover:bg-primary-red-hover transition-colors"
              >
                <Flame className="h-3 w-3" />
                All Products
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="flex items-center gap-1.5 px-4 h-full text-[11px] font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 hover:bg-gray-50 transition-colors border-b-2 border-transparent hover:border-primary-red"
                >
                  <span className="text-sm leading-none">{cat.emoji}</span>
                  {cat.label}
                </Link>
              ))}
              <Link
                href="/shop?filter=offers"
                className="flex items-center gap-1.5 px-4 h-full text-[11px] font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors ml-auto border-b-2 border-transparent hover:border-amber-500"
              >
                <Sparkles className="h-3 w-3" />
                Today&apos;s Offers
              </Link>
            </div>
          </div>
        </div>

        {/* ── Mobile search bar (slides in) ── */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isSearchOpen ? "max-h-20 border-t border-gray-100" : "max-h-0"
          }`}
        >
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={mobileSearchRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full h-10 pl-9 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-red/20 focus:border-primary-red transition-all duration-200"
                placeholder="Search wines, whisky, gin…"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu overlay ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[85vw] max-w-xs bg-white z-50 md:hidden
                    flex flex-col shadow-2xl
                    transition-transform duration-300 ease-in-out
                    ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            className="text-xl font-black tracking-tight text-zinc-900"
          >
            Ka<span className="text-primary-red">funda</span>
          </Link>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-2 rounded-lg text-zinc-500 hover:bg-gray-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer body — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Quick actions */}
          <div className="px-5 pt-5 pb-4 flex gap-3">
            <Link
              href="/cart"
              onClick={() => setIsMenuOpen(false)}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-red text-white rounded-xl py-3 text-[11px] font-bold uppercase tracking-widest"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart {itemsCount > 0 && `(${itemsCount})`}
            </Link>
            <a
              href="https://wa.me/256700000000"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMenuOpen(false)}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-xl py-3 text-[11px] font-bold uppercase tracking-widest"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>

          {/* Category list */}
          <div className="px-5 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-3">Browse</p>
            <div className="space-y-1">
              <Link
                href="/shop"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-zinc-900 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg leading-none">🛒</span>
                All Products
                <span className="ml-auto text-[10px] font-semibold text-white bg-primary-red px-2 py-0.5 rounded-full">Hot</span>
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-gray-50 hover:text-zinc-900 transition-colors"
                >
                  <span className="text-lg leading-none">{cat.emoji}</span>
                  {cat.label}
                </Link>
              ))}
              <Link
                href="/shop?filter=offers"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <span className="text-lg leading-none">✨</span>
                Today&apos;s Offers
              </Link>
            </div>
          </div>

          {/* Account section */}
          <div className="px-5 py-4 mt-2 border-t border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-3">Account</p>
            <button className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-sm font-semibold text-zinc-700 hover:bg-gray-50 transition-colors">
              <User className="h-5 w-5" />
              Sign In / Register
            </button>
          </div>
        </div>

        {/* Drawer footer (Updated Text) */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-[11px] text-center text-gray-400">
            ⚡ 1-2 hour delivery · Kampala
          </p>
        </div>
      </div>
    </>
  );
};

export default Navbar;