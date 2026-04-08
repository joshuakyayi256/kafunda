"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Plus, Minus, Trash2, Loader2, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatUGX } from "@/lib/utils";

export default function CartDrawer() {
    const { 
        cart, 
        isCartOpen, 
        closeCart, 
        updateQuantity, 
        removeFromCart, 
        subtotal 
    } = useCart();
    
    const [isRedirecting, setIsRedirecting] = useState(false);

    // --- The Headless Checkout Handshake ---
    const handleHeadlessCheckout = () => {
        setIsRedirecting(true);

        // 1. Extract database IDs from the GraphQL Global IDs
        const cartPayload = cart.map(item => {
            let databaseId = item.id;
            
            // Decode GraphQL ID if it's base64 encoded (e.g., "cG9zdDozNA==" -> 34)
            if (isNaN(Number(item.id))) {
                try {
                    const decoded = typeof window !== 'undefined' 
                        ? atob(item.id) 
                        : Buffer.from(item.id, 'base64').toString('utf-8');
                        
                    const match = decoded.match(/\d+$/);
                    if (match) databaseId = match[0];
                } catch (e) {
                    console.error("ID decode failed", e);
                }
            }
            return `${databaseId}:${item.quantity}`;
        }).join(','); // Outputs something like "8565:2,102:1"

        // 2. Encode to Base64 so it travels safely in the URL
        const encodedPayload = btoa(cartPayload);

        // 3. Send them to your live WordPress site to complete payment!
        window.location.href = `https://kafundawines.com/?headless_cart=${encodedPayload}`;
    };

    return (
        <>
            {/* Backdrop Overlay */}
            <div 
                className={`fixed inset-0 bg-black/40 z-100 transition-opacity duration-300 ${
                    isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={closeCart}
                aria-hidden="true"
            />

            {/* Sliding Drawer */}
            <div 
                className={`fixed top-0 right-0 h-full w-full sm:w-100 bg-white z-110 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
                    isCartOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5 text-primary-red" /> 
                        Your Cart
                    </h2>
                    <button 
                        onClick={closeCart}
                        className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Cart Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-gray-400">
                            <ShoppingCart className="h-16 w-16 opacity-20 mb-2" />
                            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Your cart is empty</p>
                            <p className="text-xs font-medium">Looks like you haven&apos;t added any drinks yet.</p>
                            <button 
                                onClick={closeCart}
                                className="mt-4 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-zinc-800 transition-colors"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {cart.map((item) => (
                                <div key={item.id} className="flex gap-4 group">
                                    <div className="relative w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 shrink-0 overflow-hidden">
                                        <Image 
                                            src={item.image_url} 
                                            alt={item.name} 
                                            fill 
                                            className="object-contain p-2 group-hover:scale-110 transition-transform duration-300" 
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-zinc-900 leading-snug line-clamp-2">
                                                {item.name}
                                            </h3>
                                            <p className="text-sm font-black text-primary-red mt-1">
                                                {formatUGX(item.price_ugx)}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            {/* Quantity Controls */}
                                            <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-1.5 text-zinc-500 hover:text-black hover:bg-gray-50 transition-colors rounded-l-lg"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                                <span className="text-xs font-bold px-3 py-1 min-w-8 text-center text-zinc-900">
                                                    {item.quantity}
                                                </span>
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-1.5 text-zinc-500 hover:text-black hover:bg-gray-50 transition-colors rounded-r-lg"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            {/* Remove Button */}
                                            <button 
                                                onClick={() => removeFromCart(item.id)}
                                                className="p-2 text-zinc-300 hover:text-primary-red transition-colors"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Checkout Actions */}
                {cart.length > 0 && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Subtotal</span>
                            <span className="text-xl font-black text-zinc-900">{formatUGX(subtotal)}</span>
                        </div>
                        
                        <button 
                            onClick={handleHeadlessCheckout}
                            disabled={isRedirecting}
                            className="w-full bg-primary-red hover:bg-primary-red-hover text-white py-4 px-6 font-bold text-sm tracking-widest uppercase transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed rounded-xl"
                        >
                            {isRedirecting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Connecting...</span>
                                </>
                            ) : (
                                <span>Proceed to Checkout</span>
                            )}
                        </button>
                        
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <span className="h-1.5 w-1.5 bg-success-green rounded-full"></span>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                Delivery details step next
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}