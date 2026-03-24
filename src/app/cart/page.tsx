"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Minus, Plus, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatUGX } from "@/lib/utils";

const CartPage = () => {
    const { cart, removeFromCart, updateQuantity, itemsCount, subtotal } = useCart();

    const shipping = subtotal > 500000 ? 0 : 25000;
    const tax = 0; // Tax usually included in price for UGX
    const total = subtotal + shipping + tax;

    if (itemsCount === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <h1 className="text-4xl font-black mb-6 uppercase tracking-tighter">Your Cart is Empty</h1>
                <p className="text-zinc-500 mb-10 max-w-sm mx-auto">Looks like you haven&apos;t added any premium selections to your cart yet.</p>
                <Link
                    href="/"
                    className="inline-flex items-center bg-primary-red hover:bg-primary-red-hover text-white px-10 py-4 text-sm font-bold tracking-widest uppercase transition-all shadow-lg"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    <span>Start Shopping</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-4xl font-black mb-12 uppercase tracking-tighter">
                Your Cart <span className="text-gray-400">({itemsCount} items)</span>
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left: Item List */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="divide-y divide-gray-100">
                        {cart.map((item) => (
                            <div key={item.id} className="py-6 flex flex-col sm:flex-row sm:items-center">
                                {/* Product Image */}
                                <div className="relative w-24 h-32 bg-gray-50 rounded-md overflow-hidden flex-shrink-0 mb-4 sm:mb-0">
                                    <Image
                                        src={item.image_url}
                                        alt={item.name}
                                        fill
                                        className="object-contain p-2"
                                    />
                                </div>

                                {/* Info */}
                                <div className="sm:ml-6 flex-grow">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        {item.brand}
                                    </span>
                                    <Link href={`/product/${item.id}`} className="block mt-1">
                                        <h3 className="text-lg font-black text-zinc-900 leading-tight hover:text-primary-red transition-colors capitalize">
                                            {item.name}
                                        </h3>
                                    </Link>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="mt-4 flex items-center text-xs font-bold text-gray-400 hover:text-primary-red transition-colors uppercase tracking-widest"
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        <span>Remove</span>
                                    </button>
                                </div>

                                {/* Actions & Price */}
                                <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end sm:space-x-12">
                                    <div className="flex items-center border border-gray-100 rounded-md overflow-hidden bg-white">
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            className="p-2 hover:bg-gray-50 transition-colors"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="px-4 font-bold text-sm text-zinc-900 min-w-[40px] text-center">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            className="p-2 hover:bg-gray-50 transition-colors"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-black">
                                            {formatUGX(item.price_ugx * item.quantity)}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                            {formatUGX(item.price_ugx)} each
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Link href="/" className="inline-flex items-center text-zinc-900 font-black uppercase tracking-widest text-xs hover:text-primary-red pt-8 transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        <span>Continue Shopping</span>
                    </Link>
                </div>

                {/* Right: Order Summary Card */}
                <div className="lg:col-span-1">
                    <div className="bg-secondary-gray rounded-xl p-8 sticky top-32">
                        {subtotal > 500000 ? (
                            <div className="bg-emerald-500 text-white rounded-lg p-4 mb-8 text-center animate-pulse">
                                <p className="font-bold text-sm tracking-widest uppercase">
                                    You have unlocked Free Shipping!
                                </p>
                            </div>
                        ) : (
                            <div className="bg-zinc-900 text-white rounded-lg p-4 mb-8">
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1 leading-tight">
                                    Add {formatUGX(500000 - subtotal)} more to
                                </p>
                                <p className="font-bold text-sm tracking-widest uppercase">
                                    Qualify for Free Shipping
                                </p>
                            </div>
                        )}

                        <h2 className="text-xl font-black uppercase tracking-tighter mb-6 border-b border-gray-200 pb-4">
                            Order Summary
                        </h2>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between text-sm font-medium text-zinc-600">
                                <span>Subtotal</span>
                                <span>{formatUGX(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium text-zinc-600">
                                <span>Estimated Shipping</span>
                                <span className={shipping === 0 ? "text-success-green font-bold" : ""}>
                                    {shipping === 0 ? "FREE" : formatUGX(shipping)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm font-medium text-zinc-600 border-b border-gray-200 pb-4">
                                <span>Estimated Tax</span>
                                <span>FREE</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-2">
                                <span className="text-lg font-black uppercase tracking-tighter">Total</span>
                                <span className="text-2xl font-black text-black">{formatUGX(total)}</span>
                            </div>
                        </div>

                        <Link
                            href="/checkout"
                            className="w-full bg-primary-red hover:bg-primary-red-hover text-white py-5 font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center group shadow-xl"
                        >
                            <span>Proceed to Checkout</span>
                            <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <div className="mt-8 flex flex-col items-center">
                            <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                                <ShieldCheck className="h-4 w-4 mr-1 text-success-green" />
                                <span>Secure Encrypted Checkout</span>
                            </div>
                            <div className="flex space-x-3 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
                                <Image src="https://upload.wikimedia.org/wikipedia/commons/b/b5/MTN_Logo.svg" alt="MTN" width={30} height={30} className="object-contain" />
                                <Image src="https://upload.wikimedia.org/wikipedia/commons/d/de/Airtel_logo.png" alt="Airtel" width={30} height={30} className="object-contain" />
                                <Image src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" width={30} height={30} className="object-contain" />
                                <Image src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" width={30} height={30} className="object-contain" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
