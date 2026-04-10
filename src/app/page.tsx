import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import FAQSection from "@/components/shared/FAQSection";
import BrandMarquee from "@/components/shared/BrandMarquee";
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

  // Extract items that are on sale
  const offerPicks = (liveProducts || []).filter((p) => p.is_sale).slice(0, 4);

  // Get popular picks
  const popularPicks = (liveProducts || [])
    .filter((p) => !p.is_sale)
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-zinc-900">
        <Image
          src="https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?q=80&w=2000"
          alt="Premium Spirits Cellar"
          fill
          priority
          className="object-cover opacity-40 shadow-2xl scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-900/40 to-zinc-900/80" />

        <div className="relative z-10 text-center px-4 max-w-4xl mt-12 md:mt-0 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-6 md:mb-8">
            Premium <br />
            <span className="text-success-green">Enjoyments</span><br />
            <span className="text-primary-red">Delivered</span> to Your <br />
            Doorstep.
          </h1>
          <p className="text-sm md:text-base lg:text-xl text-gray-300 mb-8 md:mb-10 max-w-2xl font-medium tracking-wide mx-auto px-4">
            Experience the finest selection of curated wines, whiskies, and spirits.
            Ordered in seconds, delivered in minutes.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center bg-primary-red hover:bg-primary-red-hover text-white px-8 md:px-10 py-4 text-xs md:text-sm font-bold tracking-widest uppercase transition-all shadow-xl transform hover:scale-105 active:scale-95 rounded-full md:rounded-none"
          >
            <span>Shop Now</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <BrandMarquee />

      {/* Categories - Modern Vertical Capsules */}
      <section className="py-20 md:py-28 bg-zinc-950 overflow-hidden">
        <div className="max-w-7xl mx-auto pl-4 pr-0 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-baseline mb-12 pr-4 sm:pr-0">
            <div>
              <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-2 md:mb-3">
                Curated Collections
              </p>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">
                Browse <span className="text-primary-red italic">Categories</span>
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] md:text-xs hover:text-white transition-colors items-center mt-3 md:mt-0 hidden md:flex"
            >
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          {displayCategories.length > 0 ? (
            <div className="flex overflow-x-auto pb-10 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 sm:gap-6 lg:gap-8 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] md:grid md:grid-cols-4 lg:grid-cols-5">
              {displayCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.name}`}
                  className="flex flex-col items-center min-w-30in-w-0 snap-start group outline-none"
                >
                  {/* Vertical Capsule (Pill) Shape with Hover Animation */}
                  <div className="relative w-28 h-40 md:w-full md:aspect-2/3 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden mb-5 transition-all duration-500 ease-out group-hover:-translate-y-3 group-hover:border-primary-red/50 group-hover:shadow-[0_15px_30px_-5px_rgba(220,38,38,0.3)]">
                    {cat.image?.sourceUrl ? (
                      <Image
                        src={cat.image.sourceUrl}
                        alt={cat.name}
                        fill
                        className="object-cover opacity-60 transition-all duration-700 ease-out group-hover:scale-110 group-hover:opacity-100"
                        sizes="(max-width: 640px) 150px, 250px"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800" />
                    )}
                    
                    {/* Modern Gradient Overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-zinc-950/90 via-zinc-950/20 to-transparent transition-opacity duration-500 group-hover:opacity-70" />
                    
                    {/* Floating Action Circle (Appears on hover) */}
                    <div className="absolute bottom-4 w-8 h-8 rounded-full bg-primary-red text-white flex items-center justify-center opacity-0 translate-y-4 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:translate-y-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                  
                  {/* Typography */}
                  <p className="text-white font-black uppercase text-[11px] md:text-sm tracking-widest text-center leading-tight transition-colors duration-300 w-full px-2 truncate group-hover:text-primary-red">
                    {cat.name}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-600 pr-4">
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

      <FAQSection />
    </main>
  );
}