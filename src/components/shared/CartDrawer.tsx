"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ArrowRight, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatUGX } from "@/lib/utils";

const CartDrawer = () => {
    const { cart, isCartOpen, closeCart, updateQuantity, removeFromCart, subtotal, itemsCount } = useCart();

    // Prevent background scrolling when drawer is open
    useEffect(() => {
        if (isCartOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isCartOpen]);

    if (!isCartOpen) return null;

    return (
        <>
            {/* Dark Overlay */}
            <div 
                className="fixed inset-0 bg-black/60 z-100 backdrop-blur-sm transition-opacity"
                onClick={closeCart}
            />

            {/* Slide-out Panel */}
            <div className="fixed inset-y-0 right-0 z-101 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                    <h2 className="text-xl font-black uppercase tracking-tighter">
                        Your Cart <span className="text-gray-400 text-sm ml-1">({itemsCount})</span>
                    </h2>
                    <button 
                        onClick={closeCart}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Free Shipping Progress */}
                <div className="px-6 py-4 bg-secondary-gray border-b border-gray-100">
                    {subtotal >= 500000 ? (
                        <p className="text-xs font-bold text-success-green uppercase tracking-widest text-center">
                            ✓ You have unlocked free shipping!
                        </p>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">
                                Add {formatUGX(500000 - subtotal)} more for free shipping
                            </p>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-primary-red h-full transition-all duration-500"
                                    style={{ width: `${Math.min((subtotal / 500000) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                <ShoppingCart className="h-8 w-8 text-gray-300" />
                            </div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Your cart is empty</p>
                            <button 
                                onClick={closeCart}
                                className="text-primary-red text-xs font-bold uppercase tracking-widest hover:underline"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {cart.map((item) => (
                                <div key={item.id} className="flex gap-4">
                                    <div className="relative w-20 h-24 bg-gray-50 rounded border border-gray-100 shrink-0">
                                        <Image src={item.image_url} alt={item.name} fill className="object-contain p-2" />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-sm font-bold leading-tight line-clamp-2 pr-4">{item.name}</h3>
                                                <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-primary-red">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{formatUGX(item.price_ugx)}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center border border-gray-200 rounded-md bg-white">
                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 hover:bg-gray-50">
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="px-3 text-xs font-bold w-8 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 hover:bg-gray-50">
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <span className="font-black text-sm">{formatUGX(item.price_ugx * item.quantity)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Checkout */}
                {cart.length > 0 && (
                    <div className="border-t border-gray-100 p-6 bg-white shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.1)]">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Subtotal</span>
                            <span className="text-xl font-black">{formatUGX(subtotal)}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-4 text-center">Taxes and shipping calculated at checkout</p>
                        <Link 
                            href="/checkout" 
                            onClick={closeCart}
                            className="w-full bg-primary-red hover:bg-primary-red-hover text-white py-4 font-bold text-xs tracking-widest uppercase transition-all flex items-center justify-center group"
                        >
                            <span>Proceed to Checkout</span>
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;