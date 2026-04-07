"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import ProductCard from "@/components/shared/ProductCard";
import FAQSection from "@/components/shared/FAQSection";
import BrandMarquee from "@/components/shared/BrandMarquee";
import OffersToday from "@/components/shared/OffersToday";
import products from "@/data/products.json";
import { Product } from "@/types";

const Home = () => {
  const categories = [
    { name: "Wines", image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=200" },
    { name: "Whisky", image: "/whisky.webp" },
    { name: "Gin", image: "https://images.unsplash.com/photo-1560512823-829485b8bf24?q=80&w=200" },
    { name: "Beers", image: "/nilo.webp" },
    { name: "Tequila", image: "/tequila.webp" },
    { name: "Champagne", image: "/champagne.webp" },
  ];

  const popularPicks = products.slice(0, 8) as Product[];

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8 }
  };

  const staggerContainer = {
    initial: { opacity: 0 },
    whileInView: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    },
    viewport: { once: true }
  };

  const staggerItem = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 }
  };

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
        <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-transparent to-zinc-900/60" />

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10 text-center px-4 max-w-4xl"
        >
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-8">
            Premium <br />
            <span className="text-success-green">Enjoyments</span><br />
            <span className="text-primary-red">Delivered</span> to Your <br />
            Doorstep.
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-sm md:text-base lg:text-xl text-gray-300 mb-10 max-w-2xl font-medium tracking-wide mx-auto"
          >
            Experience the finest selection of curated wines, whiskies, and spirits.
            Ordered in seconds, delivered in minutes.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Link
              href="/shop?filter=offers"
              className="inline-flex items-center bg-primary-red hover:bg-primary-red-hover text-white px-10 py-4 text-sm font-bold tracking-widest uppercase transition-all shadow-xl transform hover:scale-105 active:scale-95"
            >
              <span>Shop Offers</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Offers for Today */}
      <motion.div {...fadeInUp}>
        <OffersToday />
      </motion.div>

      {/* Brand Marquee */}
      <motion.div {...fadeInUp}>
        <BrandMarquee />
      </motion.div>

      {/* Shop by Category (Mobile-First Circular Design) */}
      <motion.section
        {...fadeInUp}
        className="py-20 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-baseline mb-12">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none mb-4 md:mb-0">
              Browse <span className="text-primary-red italic">Categories</span>
            </h2>
            <p className="text-zinc-500 font-medium text-xs md:text-sm uppercase tracking-[0.2em]">
              Explore our curated world
            </p>
          </div>

          {/* Horizontal Scrollable Category Circles */}
          <div className="flex overflow-x-auto pb-8 pt-4 gap-6 px-4 -mx-4 sm:mx-0 sm:px-0 no-scrollbar snap-x">
            {categories.map((cat, idx) => (
              <Link 
                key={idx} 
                href={`/shop?category=${cat.name}`}
                className="flex flex-col items-center space-y-3 min-w-25 snap-center group"
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
            ))}
          </div>
        </div>
      </motion.section>

      {/* Popular Picks */}
      <motion.section
        {...fadeInUp}
        className="py-24 bg-gray-50 border-t border-gray-100"
      >
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
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12"
          >
            {popularPicks.map((product: Product) => (
              <motion.div key={product.id} variants={staggerItem}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* About Section */}
      <motion.section
        {...fadeInUp}
        className="py-24 bg-white border-t border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative h-125 rounded-2xl overflow-hidden shadow-2xl">
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
      </motion.section>

      {/* FAQs Section */}
      <FAQSection />
    </main>
  );
};

export default Home;