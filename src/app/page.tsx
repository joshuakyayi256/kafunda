import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Droplets } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import FAQSection from "@/components/shared/FAQSection";
import BrandMarquee from "@/components/shared/BrandMarquee";
import HeroCarousel from "@/components/shared/HeroCarousel";
import RecentlyViewed from "@/components/shared/RecentlyViewed";
import { getAllProducts, getCategories } from "@/lib/api";
import { Product } from "@/types";

export default async function Home() {
  const [liveProducts, wpCategories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);

  // Filter out the "Offers" category
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

  // Popular picks: non-sale items
  const popularPicks = (liveProducts || [])
    .filter((p) => !p.is_sale)
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-white">
      <HeroCarousel />

      <BrandMarquee />

      {/* Categories — Premium Bento Grid */}
      <section className="py-20 md:py-28 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.3em] mb-2">
                Curated Collections
              </p>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none">
                Explore <br className="md:hidden" />
                <span className="text-brand-green">Categories</span>
              </h2>
            </div>
            <Link
              href="/shop"
              className="hidden md:flex items-center gap-1.5 text-zinc-400 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-full"
            >
              All Products <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {displayCategories.length > 0 ? (
            <>
              {/* Bento grid — desktop mosaic, mobile 2-col */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[160px] md:auto-rows-[200px]">
                {displayCategories.map((cat, i) => {
                  // Featured: first card spans 2 cols + 2 rows
                  const isFeatured = i === 0;
                  // Wide: spans 2 cols
                  const isWide = i === 5;

                  return (
                    <Link
                      key={cat.id}
                      href={`/shop?category=${cat.name}`}
                      className={[
                        "relative overflow-hidden rounded-2xl md:rounded-3xl group outline-none",
                        isFeatured ? "col-span-2 row-span-2" : "",
                        isWide ? "col-span-2" : "",
                      ].join(" ")}
                    >
                      {/* Image */}
                      {cat.image?.sourceUrl ? (
                        <Image
                          src={cat.image.sourceUrl}
                          alt={cat.name}
                          fill
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-zinc-800" />
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-black/5 transition-opacity duration-500" />

                      {/* Hover color wash */}
                      <div className="absolute inset-0 bg-brand-green/0 group-hover:bg-brand-green/20 transition-all duration-500" />

                      {/* Content */}
                      <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5">
                        <p className={[
                          "font-black text-white uppercase tracking-tight leading-none mb-2",
                          isFeatured ? "text-2xl md:text-3xl" : "text-sm md:text-base",
                        ].join(" ")}>
                          {cat.name}
                        </p>
                        <div className="flex items-center gap-1.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-green">
                            Shop Now
                          </span>
                          <ArrowRight className="h-3 w-3 text-brand-green" />
                        </div>
                      </div>

                      {/* Corner accent */}
                      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/0 group-hover:bg-brand-green flex items-center justify-center transition-all duration-300 scale-0 group-hover:scale-100">
                        <ArrowRight className="h-3 w-3 text-white" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile: View All link */}
              <div className="mt-6 flex md:hidden">
                <Link
                  href="/shop"
                  className="flex-1 flex items-center justify-center gap-2 border border-zinc-700 rounded-full py-3 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  View All Categories <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-zinc-600">
              <p className="uppercase tracking-widest text-xs font-bold">No categories found</p>
            </div>
          )}
        </div>
      </section>

      {/* Dedicated Offers Section */}
      {offerPicks.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-10 md:mb-12 border-b border-gray-100 pb-6">
              <div>
                <p className="flex items-center text-[10px] font-bold text-amber-600 uppercase tracking-[0.3em] mb-2 md:mb-3">
                  <Sparkles className="h-3 w-3 mr-1" /> Limited Time
                </p>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
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
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
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
            /* Static category tiles when no products are loaded */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Soft Drinks", emoji: "🥤", href: "/shop?category=Soft-Drinks", bg: "bg-sky-50 border-sky-100", text: "text-sky-700" },
                { label: "Beers & Ciders", emoji: "🍺", href: "/shop?category=Beers", bg: "bg-amber-50 border-amber-100", text: "text-amber-700" },
                { label: "Juices", emoji: "🍊", href: "/shop?category=Juice", bg: "bg-orange-50 border-orange-100", text: "text-orange-700" },
                { label: "Water & Mixers", emoji: "💧", href: "/shop?category=Mixers", bg: "bg-cyan-50 border-cyan-100", text: "text-cyan-700" },
              ].map(({ label, emoji, href, bg, text }) => (
                <Link
                  key={label}
                  href={href}
                  className={`${bg} border rounded-2xl p-6 flex flex-col items-center gap-3 hover:shadow-md transition-shadow group`}
                >
                  <span className="text-4xl">{emoji}</span>
                  <span className={`${text} text-xs font-black uppercase tracking-widest text-center`}>{label}</span>
                  <span className={`${text} text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    Shop <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Popular Picks */}
      <section className="py-16 md:py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10 md:mb-16">
            <div>
              <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-2 md:mb-3">Trending Now</p>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
                Popular Picks
              </h2>
            </div>
            <Link href="/shop" className="text-primary-red font-bold uppercase tracking-widest text-[10px] md:text-xs hover:underline flex items-center">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          {popularPicks.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {popularPicks.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <p>No products found. Make sure your WordPress backend is online and products are published!</p>
            </div>
          )}
        </div>
      </section>

      <RecentlyViewed />

      <FAQSection />
    </main>
  );
}