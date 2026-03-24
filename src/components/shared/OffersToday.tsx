"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import products from "@/data/products.json";
import { motion } from "framer-motion";

const OffersToday = () => {
    const dailyOffers = products.filter((p: any) => p.is_today_offer).slice(0, 4);

    if (dailyOffers.length === 0) return null;

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
        <section className="py-20 bg-gray-50 border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-end mb-12">
                    <h2 className="text-3xl font-black uppercase tracking-tighter">
                        Offers of the Day
                    </h2>
                    <Link href="/shop?filter=offers" className="text-primary-red font-bold uppercase tracking-widest text-xs hover:underline flex items-center">
                        View All <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                </div>
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    whileInView="whileInView"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12"
                >
                    {dailyOffers.map((offer: any) => (
                        <motion.div key={offer.id} variants={staggerItem}>
                            <ProductCard product={offer} />
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default OffersToday;
