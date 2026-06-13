"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, ShoppingCart, X, MessageCircle,
  Flame, Sparkles, Home, Store, Menu,
  Zap, ArrowRight, User, Loader2,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatUGX } from "@/lib/utils";

// Config
const SALE_END = new Date("2026-04-30T23:59:59");

const TICKER = [
  { emoji: "⚡", text: "1-2 Hour Delivery across Kampala" },
  { emoji: "🚚", text: "Free Delivery on orders over UGX 500,000" },
  { emoji: "💬", text: "Order directly via WhatsApp: +256 785 498 279" },
];

const CATEGORIES = [
  { label: "Wines",       href: "/shop?category=Wines",       emoji: "🍷" },
  { label: "Whiskies",    href: "/shop?category=Whisky",      emoji: "🥃" },
  { label: "Creams",      href: "/shop?category=Creams",      emoji: "🍶" },
  { label: "Cognacs",     href: "/shop?category=Cognacs",     emoji: "🥃" },
  { label: "Vodkas",      href: "/shop?category=Vodkas",      emoji: "🍸" },
  { label: "Champagnes",  href: "/shop?category=Champagne",   emoji: "🥂" },
  { label: "Beers",       href: "/shop?category=Beers",       emoji: "🍺" },
  { label: "Soft Drinks", href: "/shop?category=Soft-Drinks", emoji: "🥤" },
];

// Helpers
type TimeLeft = { h: number; m: number; s: number; expired: boolean };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getTimeLeft(end: Date): TimeLeft {
  const diff = Math.max(0, end.getTime() - Date.now());
  return {
    h: Math.floor(diff / 1000 / 60 / 60),
    m: Math.floor((diff / 1000 / 60) % 60),
    s: Math.floor((diff / 1000) % 60),
    expired: diff === 0,
  };
}

// Compact countdown shown inside the category strip
function InlineCountdown() {
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const tick = () => setTime(getTimeLeft(SALE_END));
    const initial = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  if (!time || time.expired) return null;

  return (
    <div className="flex items-center gap-3 shrink-0 ml-auto pl-4 border-l border-white/20">
      <div className="hidden sm:flex items-center gap-1.5">
        <Zap className="h-3 w-3 text-kafunda-mustard fill-kafunda-mustard" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
          Flash Sale
        </span>
      </div>

      <div className="flex items-center gap-0.5 font-black tabular-nums text-white text-sm">
        <span className="bg-black/30 rounded px-1.5 py-0.5">{pad(time.h)}</span>
        <span className="text-kafunda-mustard text-xs animate-pulse">:</span>
        <span className="bg-black/30 rounded px-1.5 py-0.5">{pad(time.m)}</span>
        <span className="text-kafunda-mustard text-xs animate-pulse">:</span>
        <span className="bg-black/30 rounded px-1.5 py-0.5">{pad(time.s)}</span>
      </div>

      <Link
        href="/shop?filter=offers"
        className="hidden sm:flex items-center gap-1 bg-kafunda-mustard hover:bg-amber-400 text-kafunda-burgundy text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors"
      >
        Shop Deals
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// Rotating announcement ticker
function AnnouncementBar() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % TICKER.length), 4000);
    return () => clearInterval(id);
  }, []);

  const msg = TICKER[idx];

  return (
    <div className="relative w-full bg-kafunda-burgundy text-white py-2 px-4 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-kafunda-mustard/40 to-transparent" />
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
          <span className="text-white/85">{msg.text}</span>
          <a
            href="https://wa.me/256785498279"
            className="text-kafunda-mustard font-bold hover:text-amber-300 underline underline-offset-2 transition-colors ml-1"
          >
            Order Now
          </a>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Search suggestions (#6) ──────────────────────────────────────────────────
// Backed by /api/search, which rides the 1h tagged product cache — suggestion
// keystrokes never hit WordPress live (same architecture as the catalogue).

interface SearchSuggestion {
  id: string;
  name: string;
  category: string;
  price_ugx: number;
  image_url: string;
  is_sale: boolean;
}

function MatchHighlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary-red">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function SearchSuggestionsList({
  suggestions, loading, query, activeIdx, onSelect, onSeeAll,
}: {
  suggestions: SearchSuggestion[];
  loading: boolean;
  query: string;
  activeIdx: number;
  onSelect: (s: SearchSuggestion) => void;
  onSeeAll: () => void;
}) {
  if (loading && suggestions.length === 0) {
    return (
      <div className="px-4 py-4 flex items-center gap-2 text-xs text-kafunda-burgundy/50 font-medium">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching the cellar…
      </div>
    );
  }
  if (suggestions.length === 0) {
    return (
      <div className="px-4 py-4 text-xs text-kafunda-burgundy/50 font-medium">
        No matches for &ldquo;{query}&rdquo; — press Enter to search the full shop.
      </div>
    );
  }
  return (
    <ul role="listbox" aria-label="Product suggestions">
      {suggestions.map((s, i) => (
        <li key={s.id} role="option" aria-selected={i === activeIdx}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(s)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
              i === activeIdx ? "bg-kafunda-cream/60" : "hover:bg-kafunda-cream/40"
            }`}
          >
            <div className="relative w-9 h-9 rounded-lg bg-kafunda-cream/40 border border-kafunda-cream-soft overflow-hidden shrink-0">
              <Image src={s.image_url} alt="" fill sizes="36px" className="object-contain p-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-900 line-clamp-1">
                <MatchHighlight text={s.name} query={query} />
              </p>
              <p className="text-[10px] text-kafunda-burgundy/50 line-clamp-1">{s.category}</p>
            </div>
            <div className="shrink-0 text-right">
              {s.is_sale && (
                <span className="block text-[8px] font-black uppercase tracking-wider text-kafunda-crimson">
                  Sale
                </span>
              )}
              <span className="text-xs font-black text-zinc-900">{formatUGX(s.price_ugx)}</span>
            </div>
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSeeAll}
          className={`w-full flex items-center justify-center gap-1.5 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-primary-red border-t border-kafunda-cream-soft transition-colors ${
            activeIdx === suggestions.length ? "bg-kafunda-cream/60" : "hover:bg-kafunda-cream/40"
          }`}
        >
          See all results for &ldquo;{query}&rdquo; <ArrowRight className="h-3 w-3" />
        </button>
      </li>
    </ul>
  );
}

// Main Navbar
const Navbar = () => {
  const { itemsCount } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Search suggestions
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [desktopOpen, setDesktopOpen] = useState(false);

  const overlaySearchRef = useRef<HTMLInputElement>(null);
  const desktopFormRef = useRef<HTMLFormElement>(null);

  const query = searchValue.trim();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => overlaySearchRef.current?.focus(), 60);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    document.body.style.overflow = isSearchOpen || isMoreOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSearchOpen, isMoreOpen]);

  // Close menus on route change (deferred to avoid synchronous setState in effect)
  useEffect(() => {
    const t = setTimeout(() => {
      setIsSearchOpen(false);
      setIsMoreOpen(false);
      setDesktopOpen(false);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);

  // Debounced suggestion fetch — every setState lives in timer/promise
  // callbacks (react-hooks/set-state-in-effect safe).
  useEffect(() => {
    const q = searchValue.trim();
    if (q.length < 2) {
      const t = setTimeout(() => {
        setSuggestions([]);
        setIsSuggesting(false);
        setActiveIdx(-1);
      }, 0);
      return () => clearTimeout(t);
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setSuggestions(Array.isArray(data?.results) ? data.results : []);
        setActiveIdx(-1);
        setIsSuggesting(false);
      } catch {
        // Aborted (user kept typing) or offline — leave previous list alone.
      }
    }, 220);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [searchValue]);

  // Close the desktop dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (desktopFormRef.current && !desktopFormRef.current.contains(e.target as Node)) {
        setDesktopOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const closeAll = () => {
    setIsSearchOpen(false);
    setIsMoreOpen(false);
    setDesktopOpen(false);
  };

  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    closeAll();
    setSearchValue("");
    router.push(`/shop?search=${encodeURIComponent(q)}`);
  };

  const selectSuggestion = (s: SearchSuggestion) => {
    closeAll();
    setSearchValue("");
    router.push(`/product/${s.id}`);
  };

  // Keyboard navigation: arrows cycle suggestions + the "see all" row,
  // Enter picks the active row (or submits the form when none is active),
  // Escape closes whatever is open.
  const totalRows = suggestions.length > 0 ? suggestions.length + 1 : 0;
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setDesktopOpen(false);
      setIsSearchOpen(false);
      return;
    }
    if (totalRows === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % totalRows);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + totalRows) % totalRows);
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      if (activeIdx < suggestions.length) selectSuggestion(suggestions[activeIdx]);
      else handleSearch(e);
    }
  };

  return (
    <>
      <AnnouncementBar />

      <header
        className={`sticky top-0 z-50 w-full bg-white transition-all duration-300 ${
          isScrolled
            ? "shadow-[0_4px_24px_rgba(110,31,42,0.12)]"
            : "border-b border-kafunda-cream-soft"
        }`}
      >
        {/* Main row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 md:h-18 gap-3">
            {/* Logo */}
            <Link
              href="/"
              className="shrink-0 flex items-center group"
              aria-label="Kafunda Wine Store and Spirits - Home"
            >
              <div className="relative h-9 sm:h-11 w-32.5 sm:w-42.5 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/kafunda-logo-wordmark.png"
                  alt="Kafunda Wine Store and Spirits"
                  fill
                  priority
                  sizes="(max-width: 640px) 130px, 170px"
                  className="object-contain object-left"
                />
              </div>
            </Link>

            {/* Desktop search */}
            <form
              ref={desktopFormRef}
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-2xl mx-auto relative"
            >
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-kafunda-burgundy/40" />
              </div>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setDesktopOpen(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search wines, whisky, gin, champagne..."
                role="combobox"
                aria-expanded={desktopOpen && query.length >= 2}
                aria-controls="navbar-search-suggestions"
                className="w-full h-11 pl-10 pr-10 text-sm bg-kafunda-cream/40 border border-kafunda-cream-soft rounded-2xl placeholder:text-kafunda-burgundy/40 text-zinc-900 focus:outline-none focus:border-primary-red focus:bg-white focus:ring-2 focus:ring-primary-red/10 transition-all duration-200"
              />
              {searchValue ? (
                <button
                  type="button"
                  onClick={() => setSearchValue("")}
                  className="absolute inset-y-0 right-3 flex items-center text-kafunda-burgundy/40 hover:text-kafunda-burgundy"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-medium text-kafunda-burgundy/50 bg-white px-1.5 py-0.5 rounded border border-kafunda-cream-soft">
                    Enter
                  </kbd>
                </div>
              )}

              {/* Suggestions dropdown */}
              {desktopOpen && query.length >= 2 && (
                <div
                  id="navbar-search-suggestions"
                  className="absolute top-12 left-0 right-0 z-50 bg-white border border-kafunda-cream-soft rounded-2xl shadow-[0_16px_48px_rgba(110,31,42,0.16)] overflow-hidden"
                >
                  <SearchSuggestionsList
                    suggestions={suggestions}
                    loading={isSuggesting}
                    query={query}
                    activeIdx={activeIdx}
                    onSelect={selectSuggestion}
                    onSeeAll={() => handleSearch({ preventDefault() {} })}
                  />
                </div>
              )}
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto md:ml-0">
              <button
                onClick={() => {
                  setIsSearchOpen(true);
                  setIsMoreOpen(false);
                }}
                className="md:hidden p-2.5 rounded-xl text-kafunda-burgundy/70 hover:bg-kafunda-cream/40 hover:text-kafunda-burgundy transition-colors"
                aria-label="Open search"
              >
                <Search className="h-5 w-5" />
              </button>

              <button
                className="hidden md:flex p-2.5 rounded-xl text-kafunda-burgundy/70 hover:bg-kafunda-cream/40 hover:text-kafunda-burgundy transition-colors"
                aria-label="My Account"
              >
                <User className="h-5 w-5" />
              </button>

              <Link
                href="/cart"
                className="relative p-2.5 rounded-xl text-kafunda-burgundy/70 hover:bg-kafunda-cream/40 hover:text-kafunda-burgundy transition-colors"
                aria-label={`Cart with ${itemsCount} items`}
              >
                <ShoppingCart className="h-5 w-5" />
                <AnimatePresence>
                  {itemsCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-1.5 right-1.5 translate-x-1/2 -translate-y-1/2 min-w-4.5 h-4.5 px-1 flex items-center justify-center text-[9px] font-black text-white bg-primary-red rounded-full ring-2 ring-white leading-none"
                    >
                      {itemsCount > 99 ? "99+" : itemsCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              <a
                href="https://wa.me/256785498279"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ml-1 shadow-sm shadow-emerald-500/20"
              >
                <MessageCircle className="h-4 w-4" />
                Order on WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Category sub-nav strip */}
        <div className="relative bg-brand-green border-t border-brand-green-hover">
          <div className="absolute top-0 inset-x-0 h-px bg-kafunda-mustard/30" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-11 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              <Link
                href="/shop"
                className="flex items-center gap-1.5 px-4 h-full text-[11px] font-black uppercase tracking-widest text-white bg-kafunda-burgundy/40 hover:bg-kafunda-burgundy/60 transition-colors shrink-0"
              >
                <Flame className="h-3 w-3" />
                All Products
              </Link>

              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="flex items-center gap-1.5 px-4 h-full text-[11px] font-semibold uppercase tracking-widest text-white/85 hover:text-white hover:bg-kafunda-burgundy/30 transition-colors border-b-2 border-transparent hover:border-kafunda-mustard shrink-0"
                >
                  <span className="text-sm leading-none">{cat.emoji}</span>
                  {cat.label}
                </Link>
              ))}

              <Link
                href="/shop?filter=offers"
                className="flex items-center gap-1.5 px-4 h-full text-[11px] font-bold uppercase tracking-widest text-kafunda-mustard hover:text-white hover:bg-kafunda-burgundy/30 transition-colors border-b-2 border-transparent hover:border-kafunda-mustard shrink-0"
              >
                <Sparkles className="h-3 w-3" />
                Today&apos;s Offers
              </Link>

              <InlineCountdown />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-kafunda-cream-soft safe-area-inset-bottom shadow-[0_-4px_16px_rgba(110,31,42,0.06)]">
        <div className="flex items-stretch h-16">
          {[
            { href: "/", label: "Home", Icon: Home, exact: true },
            { href: "/shop", label: "Shop", Icon: Store, exact: true },
          ].map(({ href, label, Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  active ? "text-primary-red" : "text-kafunda-burgundy/50 hover:text-kafunda-burgundy"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                {label}
              </Link>
            );
          })}

          <button
            onClick={() => {
              setIsSearchOpen(true);
              setIsMoreOpen(false);
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              isSearchOpen ? "text-primary-red" : "text-kafunda-burgundy/50 hover:text-kafunda-burgundy"
            }`}
          >
            <Search className={`h-5 w-5 ${isSearchOpen ? "stroke-[2.5]" : ""}`} />
            Search
          </button>

          <Link
            href="/cart"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide relative transition-colors ${
              pathname === "/cart" ? "text-primary-red" : "text-kafunda-burgundy/50 hover:text-kafunda-burgundy"
            }`}
          >
            <div className="relative">
              <ShoppingCart className={`h-5 w-5 ${pathname === "/cart" ? "stroke-[2.5]" : ""}`} />
              {itemsCount > 0 && (
                <span className="absolute -top-1 -right-2.5 min-w-4 h-4 px-0.5 flex items-center justify-center text-[9px] font-black text-white bg-primary-red rounded-full leading-none">
                  {itemsCount > 99 ? "99+" : itemsCount}
                </span>
              )}
            </div>
            Cart
          </Link>

          <button
            onClick={() => {
              setIsMoreOpen(!isMoreOpen);
              setIsSearchOpen(false);
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              isMoreOpen ? "text-primary-red" : "text-kafunda-burgundy/50 hover:text-kafunda-burgundy"
            }`}
          >
            <Menu className={`h-5 w-5 ${isMoreOpen ? "stroke-[2.5]" : ""}`} />
            More
          </button>
        </div>
      </nav>

      {/* Search overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              key="search-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 bg-kafunda-burgundy/55 backdrop-blur-sm"
              onClick={() => setIsSearchOpen(false)}
            />
            <motion.div
              key="search-panel"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              className="fixed top-0 left-0 right-0 z-61 bg-white shadow-2xl border-b border-kafunda-cream-soft"
            >
              <form
                onSubmit={handleSearch}
                className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-kafunda-burgundy/40" />
                  <input
                    ref={overlaySearchRef}
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search wines, whisky, gin, champagne..."
                    className="w-full h-12 pl-12 pr-4 text-base bg-kafunda-cream/40 border border-kafunda-cream-soft rounded-2xl placeholder:text-kafunda-burgundy/40 text-zinc-900 focus:outline-none focus:border-primary-red focus:bg-white transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="shrink-0 p-2.5 rounded-xl text-kafunda-burgundy/70 hover:bg-kafunda-cream/40 hover:text-kafunda-burgundy transition-colors"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" />
                </button>
              </form>

              {query.length >= 2 ? (
                <div className="max-w-3xl mx-auto px-4 pb-4">
                  <div className="bg-white border border-kafunda-cream-soft rounded-2xl shadow-sm overflow-hidden">
                    <SearchSuggestionsList
                      suggestions={suggestions}
                      loading={isSuggesting}
                      query={query}
                      activeIdx={activeIdx}
                      onSelect={selectSuggestion}
                      onSeeAll={() => handleSearch({ preventDefault() {} })}
                    />
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto px-4 pb-4 flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat.label}
                      href={cat.href}
                      onClick={closeAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-kafunda-cream/50 hover:bg-kafunda-cream rounded-full text-xs font-semibold text-kafunda-burgundy hover:text-kafunda-burgundy-hover transition-colors"
                    >
                      <span>{cat.emoji}</span>
                      {cat.label}
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile More bottom sheet */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 md:hidden bg-kafunda-burgundy/40"
              onClick={() => setIsMoreOpen(false)}
            />
            <motion.div
              key="more-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed bottom-16 left-0 right-0 z-51 md:hidden bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(110,31,42,0.15)] max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 bg-kafunda-cream rounded-full" />
              </div>

              <div className="px-6 pt-4 pb-12 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="relative h-10 w-35">
                    <Image
                      src="/kafunda-logo-wordmark.png"
                      alt="Kafunda Wine Store and Spirits"
                      fill
                      sizes="140px"
                      className="object-contain object-left"
                    />
                  </div>
                  <button
                    onClick={() => setIsMoreOpen(false)}
                    className="w-9 h-9 bg-kafunda-cream rounded-full flex items-center justify-center hover:bg-kafunda-cream-soft transition-colors"
                  >
                    <X className="w-4 h-4 text-kafunda-burgundy" />
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-kafunda-burgundy/50">
                      Product Catalog
                    </p>
                    <Link
                      href="/shop"
                      onClick={closeAll}
                      className="text-[10px] font-bold text-primary-red uppercase tracking-widest"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.slice(0, 9).map((cat) => (
                      <Link
                        key={cat.label}
                        href={cat.href}
                        onClick={closeAll}
                        className="flex flex-col items-center gap-2 py-5 px-2 rounded-2xl bg-kafunda-cream/40 border border-kafunda-cream-soft active:scale-95 transition-all text-center"
                      >
                        <span className="text-2xl leading-none">{cat.emoji}</span>
                        <span className="text-[9px] font-black uppercase tracking-tight text-kafunda-burgundy leading-tight">
                          {cat.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Link
                    href="/shop?filter=offers"
                    onClick={closeAll}
                    className="flex items-center justify-between w-full p-5 rounded-2xl bg-amber-50 text-amber-900 border border-amber-100"
                  >
                    <div className="flex items-center gap-3 font-black text-xs uppercase tracking-widest">
                      <div className="w-8 h-8 bg-kafunda-mustard rounded-lg flex items-center justify-center text-white">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      Today&apos;s Highlights
                    </div>
                    <ArrowRight className="h-4 w-4 text-kafunda-mustard" />
                  </Link>

                  <a
                    href="https://wa.me/256785498279"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeAll}
                    className="flex items-center justify-between w-full p-5 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-100"
                  >
                    <div className="flex items-center gap-3 font-black text-xs uppercase tracking-widest">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      Chat with a Sommelier
                    </div>
                    <ArrowRight className="h-4 w-4 text-emerald-400" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-kafunda-cream-soft pt-8">
                  {[
                    { label: "About Us",       href: "/about"    },
                    { label: "Delivery Info",  href: "/delivery" },
                    { label: "Contact Us",     href: "/contact"  },
                    { label: "Privacy Policy", href: "/privacy"  },
                    { label: "Terms",          href: "/terms"    },
                  ].map(({ label, href }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeAll}
                      className="text-kafunda-burgundy/60 hover:text-kafunda-burgundy text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                    >
                      <div className="w-1 h-1 bg-kafunda-burgundy/30 rounded-full" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;