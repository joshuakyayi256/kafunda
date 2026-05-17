export const dynamic = 'force-dynamic';

import Link from "next/link";
import { ArrowRight, Sparkles, Droplets } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import FAQSection from "@/components/shared/FAQSection";
import BrandMarquee from "@/components/shared/BrandMarquee";
import HeroCarousel from "@/components/shared/HeroCarousel";
import RecentlyViewed from "@/components/shared/RecentlyViewed";
import CategoryMarquee from "@/components/shared/CategoryMarquee";
import ProductMarquee from "@/components/shared/ProductMarquee";
import { getAllProducts, getCategories } from "@/lib/api";
import { Product } from "@/types";

export default async function Home() {
  const [liveProducts, wpCategories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);

  // Filter out the "Offers" pseudo-category
  const displayCategories = (wpCategories || []).filter(
    (cat) => cat.name.toLowerCase() !== "offers" && cat.name.toLowerCase() !== "offer"
  );

  // All sale items — show everything, no artificial cap
  const offerPicks = (liveProducts || []).filter((p) => p.is_sale);

  // Cold drinks: Soft Drinks, Beers, Juices, Water
  const COLD_CATS = ["soft drink", "beer", "juice", "water", "soda", "cider", "non-alcoholic"];
  const coldDrinks = (liveProducts || [])
    .filter((p) => COLD_CATS.some((kw) => p.category?.toLowerCase().includes(kw)))
    .slice(0, 8);

  // Popular picks: non-sale items — fed to the scrolling marquee
  const popularPicks = (liveProducts || [])
    .filter((p) => !p.is_sale)
    .slice(0, 16);

  return (
    <main className="min-h-screen bg-white">
      <HeroCarousel />

      <BrandMarquee />

      {/* Categories — right-to-left auto-scrolling strip (replaces bento) */}
      <CategoryMarquee categories={displayCategories} />

      {/* Dedicated Offers Section — kept as grid for product detail */}
      {offerPicks.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-10 md:mb-12 border-b border-gray-100 pb-6">
              <div>
                <p className="flex items-center text-[10px] font-bold text-kafunda-mustard uppercase tracking-[0.3em] mb-2 md:mb-3">
                  <Sparkles className="h-3 w-3 mr-1" /> Limited Time
                </p>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-kafunda-burgundy">
                  Today&apos;s <span className="text-primary-red">Offers</span>
                </h2>
              </div>
              <Link href="/shop?filter=offers" className="text-primary-red font-bold uppercase tracking-widest text-[10px] md:text-xs hover:underline flex items-center">
                View All Offers <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {offerPicks.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cold Drinks & Refreshments */}
      <section className="py-16 md:py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10 md:mb-12">
            <div>
              <p className="flex items-center text-[10px] font-bold text-brand-green uppercase tracking-[0.3em] mb-2 md:mb-3">
                <Droplets className="h-3 w-3 mr-1" /> Not Just Liquor
              </p>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-kafunda-burgundy">
                Cold Drinks &amp; <span className="text-brand-green">Refreshments</span>
              </h2>
              <p className="text-sm text-zinc-500 mt-2 font-medium max-w-md">
                Soft drinks, beers, juices &amp; more — perfect for every occasion and every guest.
              </p>
            </div>
            <Link href="/shop?category=Soft-Drinks" className="text-brand-green font-bold uppercase tracking-widest text-[10px] md:text-xs hover:underline flex items-center">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          {coldDrinks.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {coldDrinks.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Soft Drinks",    emoji: "🥤", href: "/shop?category=Soft-Drinks", bg: "bg-sky-50 border-sky-100",      text: "text-sky-700" },
                { label: "Beers & Ciders", emoji: "🍺", href: "/shop?category=Beers",       bg: "bg-amber-50 border-amber-100",  text: "text-amber-700" },
                { label: "Juices",         emoji: "🍊", href: "/shop?category=Juice",       bg: "bg-orange-50 border-orange-100", text: "text-orange-700" },
                { label: "Water & Mixers", emoji: "💧", href: "/shop?category=Mixers",      bg: "bg-cyan-50 border-cyan-100",    text: "text-cyan-700" },
              ].map(({ label, emoji, href, bg, text }) => (
                <Link
                  key={label}
                  href={href}
                  className={`${bg} border rounded-2xl p-6 flex flex-col items-center gap-3 hover:shadow-md transition-shadow group`}
                >
                  <span className="text-4xl">{emoji}</span>
                  <span className={`${text} text-xs font-black uppercase tracking-widest text-center`}>{label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Popular Picks — left-to-right auto-scrolling strip (counter-motion to categories) */}
      <ProductMarquee
        products={popularPicks}
        title="Popular Picks"
        eyebrow="Trending Now"
        accent="red"
        viewAllHref="/shop"
      />

      <RecentlyViewed />

      <FAQSection />
    </main>
  );
}