"use client";

/**
 * Cart drawer — slides in from the right whenever something is added to the
 * cart (CartContext.addToCart → openCart) or the header cart icon is tapped.
 *
 * Built to shorten the path to purchase: the item just added is visible, the
 * free-delivery progress nudges basket size, and one big Checkout button goes
 * straight to /checkout. (The old drawer handed off to the WordPress checkout;
 * the site's own checkout replaced that.)
 */

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useScrollLock } from "@/lib/useScrollLock";
import { formatUGX } from "@/lib/utils";
import { DELIVERY_FEE, qualifiesForFreeDelivery } from "@/lib/constants";

export default function CartDrawer() {
    const {
        cart,
        isCartOpen,
        closeCart,
        updateQuantity,
        removeFromCart,
        subtotal,
        itemsCount,
    } = useCart();
    const pathname = usePathname();

    // Close on navigation (e.g. after tapping Checkout or a product).
    useEffect(() => {
        closeCart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Lock page scroll while open (shared, counted lock); Esc closes.
    useScrollLock(isCartOpen);
    useEffect(() => {
        if (!isCartOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeCart(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isCartOpen, closeCart]);

    const threshold = DELIVERY_FEE.FREE_DELIVERY_THRESHOLD_UGX;
    const freeDelivery = qualifiesForFreeDelivery(subtotal);
    const remaining = Math.max(0, threshold - subtotal);
    const progress = Math.min(100, Math.round((subtotal / threshold) * 100));

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/40 z-100 transition-opacity duration-300 ${
                    isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={closeCart}
                aria-hidden="true"
            />

            {/* Drawer */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Your cart"
                aria-hidden={!isCartOpen}
                className={`fixed top-0 right-0 h-dvh w-[92vw] max-w-md bg-white z-110 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
                    isCartOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-black uppercase tracking-widest flex items-center gap-2.5">
                        <ShoppingCart className="h-5 w-5 text-kafunda-green" />
                        Your Cart
                        {itemsCount > 0 && (
                            <span className="text-xs font-bold text-zinc-400 normal-case tracking-normal">
                                ({itemsCount} {itemsCount === 1 ? "item" : "items"})
                            </span>
                        )}
                    </h2>
                    <button
                        type="button"
                        onClick={closeCart}
                        aria-label="Close cart"
                        className="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Free delivery progress */}
                {cart.length > 0 && (
                    <div className="px-4 sm:px-6 py-3 bg-kafunda-green-tint/60 border-b border-kafunda-green/10">
                        <p className="flex items-center gap-2 text-xs font-semibold text-kafunda-green-deep">
                            <Truck className="h-4 w-4 shrink-0" />
                            {freeDelivery ? (
                                <>You&apos;ve unlocked <span className="font-black">FREE delivery</span>!</>
                            ) : (
                                <>Add <span className="font-black">{formatUGX(remaining)}</span> more for free delivery</>
                            )}
                        </p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-white overflow-hidden">
                            <div
                                className="h-full rounded-full bg-kafunda-green transition-all duration-500"
                                style={{ width: `${freeDelivery ? 100 : progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Items */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4" data-lenis-prevent>
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-gray-400">
                            <ShoppingCart className="h-14 w-14 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Your cart is empty</p>
                            <p className="text-xs font-medium">Add a drink and it will show up here.</p>
                            <Link
                                href="/shop"
                                onClick={closeCart}
                                className="mt-3 px-6 py-3 bg-kafunda-green hover:bg-kafunda-green-deep text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors"
                            >
                                Start Shopping
                            </Link>
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {[...cart].reverse().map((item) => (
                                <li key={item.id} className="flex gap-3">
                                    <Link
                                        href={`/product/${item.id}`}
                                        onClick={closeCart}
                                        className="relative w-18 h-18 bg-gray-50 rounded-xl border border-gray-100 shrink-0 overflow-hidden"
                                    >
                                        <Image src={item.image_url} alt={item.name} fill sizes="72px" className="object-contain p-1.5" />
                                    </Link>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-zinc-900 leading-snug line-clamp-2">
                                                {item.name}
                                            </h3>
                                            <p className="text-sm font-black text-zinc-900 mt-0.5">
                                                {formatUGX(item.price_ugx * item.quantity)}
                                                {item.quantity > 1 && (
                                                    <span className="ml-1.5 text-[11px] font-medium text-zinc-400">
                                                        ({formatUGX(item.price_ugx)} each)
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center border border-gray-200 rounded-full bg-white">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    aria-label={`One less ${item.name}`}
                                                    className="w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-black transition-colors"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                                <span className="text-sm font-bold min-w-6 text-center text-zinc-900">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    aria-label={`One more ${item.name}`}
                                                    className="w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-black transition-colors"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.id)}
                                                aria-label={`Remove ${item.name}`}
                                                className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="border-t border-gray-100 px-4 sm:px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white">
                        <div className="flex justify-between items-baseline mb-3">
                            <span className="text-sm font-bold text-zinc-500">Subtotal</span>
                            <span className="text-xl font-black text-zinc-900">{formatUGX(subtotal)}</span>
                        </div>
                        <Link
                            href="/checkout"
                            onClick={closeCart}
                            className="w-full flex items-center justify-center gap-2 bg-kafunda-green hover:bg-kafunda-green-deep text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-colors shadow-lg"
                        >
                            Checkout <ArrowRight className="h-4 w-4" />
                        </Link>
                        <button
                            type="button"
                            onClick={closeCart}
                            className="w-full mt-2 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
                        >
                            Continue Shopping
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
}
