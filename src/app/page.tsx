import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import FAQSection from "@/components/shared/FAQSection";
import BrandMarquee from "@/components/shared/BrandMarquee";
import { getAllProducts } from "@/lib/api"; 
import { Product } from "@/types";

export default async function Home() {
  const liveProducts = await getAllProducts() || [];
  
  // We grab the first 8 products for the "Popular Picks" section
  const popularPicks = liveProducts.slice(0, 8);

  const categories = [
    { name: "Wines", image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=200" },
    { name: "Whisky", image: "/whisky.webp" },
    { name: "Gin", image: "https://images.unsplash.com/photo-1560512823-829485b8bf24?q=80&w=200" },
    { name: "Beers", image: "/nilo.webp" },
    { name: "Tequila", image: "/tequila.webp" },
    { name: "Champagne", image: "/champagne.webp" },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen py-20 flex items-center justify-center overflow-hidden bg-zinc-900">
        <Image
          src="https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?q=80&w=2000"
          alt="Premium Spirits Cellar"
          fill
          priority
          className="object-cover opacity-40 shadow-2xl scale-105"
        />
        {/* Updated Tailwind v4 linear gradient syntax */}
        <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-transparent to-zinc-900/60" />

        <div className="relative z-10 text-center px-4 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-8">
            Premium <br />
            <span className="text-success-green">Enjoyments</span><br />
            <span className="text-primary-red">Delivered</span> to Your <br />
            Doorstep.
          </h1>
          <p className="text-sm md:text-base lg:text-xl text-gray-300 mb-10 max-w-2xl font-medium tracking-wide mx-auto">
            Experience the finest selection of curated wines, whiskies, and spirits.
            Ordered in seconds, delivered in minutes.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center bg-primary-red hover:bg-primary-red-hover text-white px-10 py-4 text-sm font-bold tracking-widest uppercase transition-all shadow-xl transform hover:scale-105 active:scale-95"
          >
            <span>Shop Now</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <BrandMarquee />

      {/* Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-baseline mb-12">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none mb-4 md:mb-0">
              Browse <span className="text-primary-red italic">Categories</span>
            </h2>
            <p className="text-zinc-500 font-medium text-xs md:text-sm uppercase tracking-[0.2em]">
              Explore our curated world
            </p>
          </div>

          <div className="flex overflow-x-auto pb-8 pt-4 gap-6 px-4 -mx-4 sm:mx-0 sm:px-0 no-scrollbar snap-x">
            {categories.map((cat, idx) => (
              <div key={idx} className="snap-center">
                {/* Updated Tailwind v4 min-w-25 syntax */}
                <Link 
                  href={`/shop?category=${cat.name}`}
                  className="flex flex-col items-center space-y-3 min-w-25 group"
                >
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary-red transition-all duration-300 shadow-md bg-gray-50">
                    <Image 
                      src={cat.image} 
                      alt={cat.name} 
                      fill 
                      className="object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-zinc-800 group-hover:text-primary-red transition-colors">
                    {cat.name}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Picks */}
      <section className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-16">
            <div>
              <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-3">Trending Now</p>
              <h2 className="text-3xl font-black uppercase tracking-tighter">
                Popular Picks
              </h2>
            </div>
            <Link href="/shop" className="text-primary-red font-bold uppercase tracking-widest text-xs hover:underline flex items-center">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          
          {popularPicks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
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