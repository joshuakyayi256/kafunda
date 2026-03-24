"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import ProductCard from "@/components/shared/ProductCard";
import TrustBadges from "@/components/shared/TrustBadges";
import FAQSection from "@/components/shared/FAQSection";
import BrandMarquee from "@/components/shared/BrandMarquee";
import OffersToday from "@/components/shared/OffersToday";
import products from "@/data/products.json";

const Home = () => {
  const categories = [
    { name: "Wines", image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=200" },
    { name: "Whisky", image: "/whisky.webp" },
    { name: "Gin", image: "https://images.unsplash.com/photo-1560512823-829485b8bf24?q=80&w=200" },
    { name: "Beers", image: "/nilo.webp" },
    { name: "Tequila", image: "/tequila.webp" },
    { name: "Champagne", image: "/champagne.webp" },
  ];

  const popularPicks = products.slice(0, 8);

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
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-zinc-900/60" />

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

      {/* Shop by Category Redesign */}
      <motion.section
        {...fadeInUp}
        className="py-32 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-baseline mb-16 px-4">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4 md:mb-0">
              Selected <span className="text-primary-red italic">Collections</span>
            </h2>
            <p className="text-zinc-500 font-medium text-xs md:text-sm uppercase tracking-[0.2em]">
              Explore our curated world of spirits
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {categories.map((cat, idx) => (
              <motion.div key={idx} variants={staggerItem}>
                <Link
                  href={`/shop?category=${cat.name}`}
                  className="group relative h-[450px] overflow-hidden rounded-2xl shadow-2xl hover:shadow-[#b91c1c1f] transition-all duration-700 block"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent group-hover:from-black group-hover:via-black/30 transition-all duration-700 z-10" />
                  <Image
                    src={cat.image.replace("w=200", "w=800")}
                    alt={cat.name}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 z-20 p-10 flex flex-col justify-end">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <p className="text-primary-red font-black text-[10px] uppercase tracking-[0.4em] mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                        Discovery
                      </p>
                      <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-4">
                        {cat.name}
                      </h3>
                      <div className="h-0.5 w-12 bg-primary-red scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                    </div>
                    <div className="mt-8 flex items-center text-white/60 text-[10px] uppercase font-bold tracking-[0.2em] group-hover:text-white transition-colors duration-300">
                      Explore Collection <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-2 transition-transform duration-300" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
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
            {popularPicks.map((product: any) => (
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
      </motion.section>

      {/* FAQs Section */}
      <FAQSection />
    </main>
  );
};

export default Home;
