"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingCart, User, Menu, X, MessageCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import CartDrawer from "../shared/CartDrawer";
import products from "@/data/products.json";
import { Product } from "@/types";
import { formatUGX } from "@/lib/utils";

// --- Reusable Search Component ---
const SearchAutocomplete = ({ isMobile = false, closeMenu }: { isMobile?: boolean, closeMenu?: () => void }) => {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Calculate results on the fly during render (Much faster, no useEffect needed!)
    const results = query.trim().length > 1
        ? (products as Product[]).filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.brand.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5) // Limit to top 5 results for clean UI
        : [];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (val.trim().length > 1) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    return (
        <div className={`relative ${isMobile ? 'w-full' : 'max-w-lg w-full'}`} ref={searchRef}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => query.trim().length > 1 && setIsOpen(true)}
                className="block w-full pl-10 pr-3 py-2 border-0 bg-gray-50 rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-red sm:text-sm transition-all"
                placeholder="Search for wines, whisky, gin..."
            />

            {/* Autocomplete Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-100 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                    {results.length > 0 ? (
                        <ul className="py-2 divide-y divide-gray-50">
                            {results.map(product => (
                                <li key={product.id}>
                                    <Link
                                        href={`/product/${product.id}`}
                                        onClick={() => {
                                            setIsOpen(false);
                                            setQuery(""); // Clear search after clicking
                                            if (closeMenu) closeMenu(); // Close mobile menu if applicable
                                        }}
                                        className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="relative w-12 h-16 shrink-0 bg-white rounded border border-gray-100 p-1 group-hover:border-primary-red/30 transition-colors">
                                            <Image src={product.image_url} alt={product.name} fill className="object-contain" />
                                        </div>
                                        <div className="ml-4 flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{product.brand}</p>
                                            <p className="text-sm font-bold text-zinc-900 truncate group-hover:text-primary-red transition-colors">{product.name}</p>
                                            <p className="text-sm font-black text-black mt-1">{formatUGX(product.price_ugx)}</p>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm font-bold text-zinc-900 mb-1">No results found</p>
                            <p className="text-xs text-zinc-500">We couldn&apos;t find anything matching &quot;{query}&quot;</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
// --- End Reusable Search Component ---


const Navbar = () => {
    const { itemsCount, openCart } = useCart();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm">
                {/* Top Delivery Announcement Bar */}
                <div className="bg-zinc-900 text-white py-1.5 px-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-2">
                    <span className="w-2 h-2 bg-success-green rounded-full animate-pulse"></span>
                    <span>Fast Delivery: 30-45 Mins within Kampala & Entebbe</span>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="shrink-0 flex items-center space-x-8">
                            <Link href="/" className="text-2xl font-black tracking-tighter text-black uppercase">
                                Kafunda
                            </Link>
                            <div className="hidden md:flex space-x-6">
                                <Link href="/shop" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">Shop</Link>
                                <Link href="/shop?category=Wines" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">Wines</Link>
                                <Link href="/shop?category=Whisky" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">Whisky</Link>
                            </div>
                        </div>

                        {/* Search Bar (Desktop) */}
                        <div className="hidden md:flex flex-1 justify-center px-8">
                            <SearchAutocomplete />
                        </div>

                        {/* Right Icons */}
                        <div className="flex items-center space-x-4">
                            <button className="p-2 rounded-full hover:bg-gray-50 text-black">
                                <User className="h-6 w-6" />
                            </button>
                            
                            <button 
                                onClick={openCart} 
                                className="p-2 rounded-full hover:bg-gray-50 text-black relative"
                            >
                                <ShoppingCart className="h-6 w-6" />
                                {itemsCount > 0 && (
                                    <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-primary-red rounded-full">
                                        {itemsCount}
                                    </span>
                                )}
                            </button>

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
                    <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-4 pb-6 space-y-6 shadow-inner">
                        <SearchAutocomplete isMobile={true} closeMenu={() => setIsMenuOpen(false)} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Link href="/shop" onClick={() => setIsMenuOpen(false)} className="text-black font-bold uppercase tracking-widest text-xs py-2">Shop All</Link>
                            <Link href="/shop?category=Wines" onClick={() => setIsMenuOpen(false)} className="text-gray-600 font-medium text-sm py-2">Wines</Link>
                            <Link href="/shop?category=Whisky" onClick={() => setIsMenuOpen(false)} className="text-gray-600 font-medium text-sm py-2">Whisky</Link>
                            <Link href="/shop?category=Gin" onClick={() => setIsMenuOpen(false)} className="text-gray-600 font-medium text-sm py-2">Gin</Link>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-100 space-y-3">
                            <a
                                href="https://wa.me/256700000000"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center space-x-2 bg-emerald-500 text-white py-3 text-xs font-bold uppercase tracking-widest rounded-md shadow-sm"
                            >
                                <MessageCircle className="h-4 w-4" />
                                <span>Chat to Order</span>
                            </a>
                            {itemsCount > 0 && (
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        openCart();
                                    }}
                                    className="w-full text-center bg-primary-red text-white py-3 text-xs font-bold uppercase tracking-widest rounded-md shadow-sm"
                                >
                                    Open Cart ({itemsCount})
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            <CartDrawer />
        </>
    );
};

export default Navbar;