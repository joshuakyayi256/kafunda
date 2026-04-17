"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Check } from "lucide-react";

interface Props {
  categories: string[];
  currentCategory: string;
  currentFilter: string | null;
  currentSearch: string | null;
  totalProducts: number;
}

const PRICE_RANGES = [
  { label: "Under 50,000", min: 0,      max: 50000  },
  { label: "50k – 100k",  min: 50000,   max: 100000 },
  { label: "100k – 250k", min: 100000,  max: 250000 },
  { label: "250k – 500k", min: 250000,  max: 500000 },
  { label: "Over 500k",   min: 500000,  max: Infinity },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-gray-100 py-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-700 group-hover:text-zinc-900 transition-colors">
          {title}
        </span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
          : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        }
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ShopFilters({ categories, currentCategory, currentFilter, currentSearch, totalProducts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeCount = [
    currentCategory !== "All",
    currentFilter === "offers",
    searchParams.get("minPrice"),
    searchParams.get("inStock") === "true",
  ].filter(Boolean).length;

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // reset pagination on filter change
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    router.push(`${pathname}?${params.toString()}`);
    setDrawerOpen(false);
  }

  function clearAll() {
    router.push("/shop");
    setDrawerOpen(false);
  }

  const currentMinPrice = searchParams.get("minPrice");
  const currentMaxPrice = searchParams.get("maxPrice");
  const currentInStock  = searchParams.get("inStock") === "true";

  const FilterContent = () => (
    <div className="space-y-0">
      {/* Active filter count + clear */}
      {activeCount > 0 && (
        <div className="pb-4 border-b border-gray-100">
          <button
            onClick={clearAll}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary-red hover:text-primary-red-hover transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all filters ({activeCount})
          </button>
        </div>
      )}

      {/* Category */}
      <Section title="Category">
        <ul className="space-y-1">
          {categories.map((cat) => {
            const active = currentCategory.toLowerCase() === cat.toLowerCase();
            return (
              <li key={cat}>
                <button
                  onClick={() => navigate({ category: cat === "All" ? null : cat })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-gray-50 hover:text-zinc-900"
                  }`}
                >
                  <span>{cat}</span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Price Range */}
      <Section title="Price Range">
        <ul className="space-y-1">
          {PRICE_RANGES.map((range) => {
            const active =
              currentMinPrice === String(range.min) &&
              currentMaxPrice === (range.max === Infinity ? null : String(range.max));
            return (
              <li key={range.label}>
                <button
                  onClick={() =>
                    navigate({
                      minPrice: active ? null : String(range.min),
                      maxPrice: active || range.max === Infinity ? null : String(range.max),
                    })
                  }
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-gray-50 hover:text-zinc-900"
                  }`}
                >
                  <span>{range.label}</span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Availability */}
      <Section title="Availability">
        <button
          onClick={() => navigate({ inStock: currentInStock ? null : "true" })}
          className="flex items-center gap-3 w-full"
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            currentInStock ? "bg-zinc-900 border-zinc-900" : "border-gray-300"
          }`}>
            {currentInStock && <Check className="h-3 w-3 text-white" />}
          </div>
          <span className="text-xs font-semibold text-zinc-600">In Stock Only</span>
        </button>
      </Section>

      {/* Offers */}
      <Section title="Promotions">
        <button
          onClick={() => navigate({ filter: currentFilter === "offers" ? null : "offers" })}
          className="flex items-center gap-3 w-full"
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            currentFilter === "offers" ? "bg-zinc-900 border-zinc-900" : "border-gray-300"
          }`}>
            {currentFilter === "offers" && <Check className="h-3 w-3 text-white" />}
          </div>
          <span className="text-xs font-semibold text-zinc-600">On Sale</span>
        </button>
      </Section>
    </div>
  );

  return (
    <>
      {/* ── Mobile: Filter trigger button ── */}
      <div className="lg:hidden mb-6">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 border-2 border-gray-200 hover:border-zinc-900 text-zinc-700 hover:text-zinc-900 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="bg-primary-red text-white text-[10px] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Desktop: Sidebar ── */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-28">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">
              Filters
            </h2>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {totalProducts} items
            </span>
          </div>
          <FilterContent />
        </div>
      </aside>

      {/* ── Mobile: Slide-in drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed top-0 left-0 bottom-0 z-51 w-72 bg-white shadow-2xl overflow-y-auto lg:hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">
                  Filters
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-zinc-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-4">
                <FilterContent />
              </div>
              <div className="sticky bottom-0 px-5 py-4 bg-white border-t border-gray-100">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-full bg-zinc-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Show {totalProducts} Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
