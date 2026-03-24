"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, ShoppingCart, User, Menu, X, MessageCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";

const Navbar = () => {
    const { itemsCount } = useCart();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center space-x-8">
                        <Link href="/" className="text-2xl font-black tracking-tighter text-black uppercase">
                            Kafunda
                        </Link>
                        <div className="hidden md:flex space-x-6">
                            <Link href="/shop" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
                                Shop
                            </Link>
                            <Link href="/shop?category=Wines" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
                                Wines
                            </Link>
                            <Link href="/shop?category=Whisky" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
                                Whisky
                            </Link>
                        </div>
                    </div>

                    {/* Search Bar (Desktop) */}
                    <div className="hidden md:flex flex-1 justify-center px-8">
                        <div className="max-w-lg w-full relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border-0 bg-gray-50 rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-red sm:text-sm"
                                placeholder="Search for wines, whisky, gin..."
                            />
                        </div>
                    </div>

                    {/* Right Icons */}
                    <div className="flex items-center space-x-4">
                        <button className="p-2 rounded-full hover:bg-gray-50 text-black">
                            <User className="h-6 w-6" />
                        </button>
                        <Link href="/cart" className="p-2 rounded-full hover:bg-gray-50 text-black relative">
                            <ShoppingCart className="h-6 w-6" />
                            {itemsCount > 0 && (
                                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-primary-red rounded-full">
                                    {itemsCount}
                                </span>
                            )}
                        </Link>
                        <a
                            href="https://wa.me/256700000000"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden md:flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all shadow-sm ml-2"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span>Chat to Order</span>
                        </a>
                        <button
                            className="md:hidden p-2 rounded-full hover:bg-gray-50 text-black"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Search & Menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-6 space-y-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border-0 bg-gray-50 rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-red sm:text-sm"
                            placeholder="Search products..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/shop" className="text-black font-bold uppercase tracking-widest text-xs py-2">Shop All</Link>
                        <Link href="/shop?category=Wines" className="text-gray-600 font-medium text-sm py-2">Wines</Link>
                        <Link href="/shop?category=Whisky" className="text-gray-600 font-medium text-sm py-2">Whisky</Link>
                        <Link href="/shop?category=Gin" className="text-gray-600 font-medium text-sm py-2">Gin</Link>
                    </div>
                    <div className="pt-4 border-t border-gray-100 space-y-3">
                        <a
                            href="https://wa.me/256700000000"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center space-x-2 bg-emerald-500 text-white py-3 text-xs font-bold uppercase tracking-widest rounded-md"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span>Chat to Order</span>
                        </a>
                        {itemsCount > 0 && (
                            <Link
                                href="/checkout"
                                className="block w-full text-center bg-primary-red text-white py-3 text-xs font-bold uppercase tracking-widest rounded-md"
                            >
                                Checkout Now
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
