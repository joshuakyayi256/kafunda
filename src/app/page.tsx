"use client";

import React, { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ProductCard from "@/components/shared/ProductCard";
import TrustBadges from "@/components/shared/TrustBadges";
import FAQSection from "@/components/shared/FAQSection";
import BrandMarquee from "@/components/shared/BrandMarquee";
import OffersToday from "@/components/shared/OffersToday";
import products from "@/data/products.json";

const Home = () => {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Hero Animation
      gsap.from(".hero-content > *", {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power4.out",
      });

      // Section Reveals
      const sections = gsap.utils.toArray(".reveal-section");
      sections.forEach((section: any) => {
        gsap.from(section, {
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
          y: 40,
          opacity: 0,
          duration: 1,
          ease: "power2.out",
        });
      });

      // Staggered reveals for grids
      const grids = gsap.utils.toArray(".stagger-grid");
      grids.forEach((grid: any) => {
        gsap.from(grid.querySelectorAll(".stagger-item"), {
          scrollTrigger: {
            trigger: grid,
            start: "top 80%",
          },
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power2.out",
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const categories = [
    { name: "Wines", image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=200" },
    { name: "Whisky", image: "https://images.unsplash.com/photo-1527281405159-35d5b5d71842?q=80&w=200" },
    { name: "Gin", image: "https://images.unsplash.com/photo-1560512823-829485b8bf24?q=80&w=200" },
    { name: "Beers", image: "https://images.unsplash.com/photo-1532634733-cae137662c11?q=80&w=200" },
    { name: "Tequila", image: "https://images.unsplash.com/photo-1516535794938-102281610b48?q=80&w=200" },
    { name: "Champagne", image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?q=80&w=200" },
  ];

  const popularPicks = products.slice(0, 8);

  return (
    <main ref={containerRef} className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-zinc-900">
        <Image
          src="https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?q=80&w=2000"
          alt="Premium Spirits Cellar"
          fill
          priority
          className="object-cover opacity-50 blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-zinc-900/40" />

        <div className="relative z-10 text-center px-4 max-w-4xl hero-content">
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-8">
            Premium Spirits <br />
            <span className="text-primary-red">Delivered</span> to Your <br />
            Doorstep.
          </h1>
          <p className="text-sm md:text-base lg:text-xl text-gray-300 mb-10 max-w-2xl font-medium tracking-wide mx-auto">
            Experience the finest selection of curated wines, whiskies, and spirits.
            Ordered in seconds, delivered in minutes.
          </p>
          <Link
            href="/shop?filter=offers"
            className="inline-flex items-center bg-primary-red hover:bg-primary-red-hover text-white px-10 py-4 text-sm font-bold tracking-widest uppercase transition-all shadow-xl transform hover:scale-105 active:scale-95"
          >
            <span>Shop Offers</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Offers for Today */}
      <div className="reveal-section">
        <OffersToday />
      </div>

      {/* Brand Marquee */}
      <div className="reveal-section">
        <BrandMarquee />
      </div>

      {/* Category Row */}
      <section className="py-20 bg-white reveal-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center mb-16 uppercase tracking-tighter">
            Shop by Category
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 md:gap-10 stagger-grid">
            {categories.map((cat, idx) => (
              <Link
                key={idx}
                href={`/shop?category=${cat.name}`}
                className="group flex flex-col items-center stagger-item"
              >
                <div className="relative w-20 h-20 md:w-32 md:h-32 mb-4 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary-red transition-all duration-300 shadow-lg">
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-black transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Picks */}
      <section className="py-24 bg-gray-50 border-t border-gray-100 reveal-section">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 stagger-grid popular-picks-section">
            {popularPicks.map((product: any) => (
              <div key={product.id} className="stagger-item">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 bg-white border-t border-gray-100 reveal-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/Your Finest Hour.jpg"
                alt="Premium Spirits Selection"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight mb-8">
                Your Finest Hour, <br />
                <span className="text-primary-red">Delivered.</span>
              </h2>
              <p className="text-zinc-600 text-lg mb-8 leading-relaxed">
                From rare vintage whiskies to the world&apos;s most celebrated wines, Kafunda brings the luxury of a premium bar directly to your doorstep. We pride ourselves on curated selection, swift delivery, and the art of fine drinking.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-2xl font-black mb-2">150+</h4>
                  <p className="text-xs font-bold text-gray-400 border-t border-gray-100 pt-2 uppercase tracking-widest">Premium Labels</p>
                </div>
                <div>
                  <h4 className="text-2xl font-black mb-2">30m</h4>
                  <p className="text-xs font-bold text-gray-400 border-t border-gray-100 pt-2 uppercase tracking-widest">Avg Delivery</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <FAQSection />
    </main>
  );
};

export default Home;
