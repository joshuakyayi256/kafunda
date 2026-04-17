"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Truck,
  Loader2,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatUGX } from "@/lib/utils";
import { useRouter } from "next/navigation";

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, itemsCount, subtotal } =
    useCart();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Wrap in a setTimeout to satisfy strict ESLint rules about synchronous updates
    const timer = setTimeout(() => {
      setIsMounted(true);
      setIsRedirecting(false); // Reset redirect state if returning from checkout
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleCheckout = () => {
    setIsRedirecting(true);
    router.push("/checkout");
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-red" />
      </div>
    );
  }

  if (itemsCount === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="bg-gray-50 rounded-2xl p-12 max-w-2xl mx-auto border border-gray-100">
          <h1 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-tighter text-zinc-900">
            Your Cart is Empty
          </h1>
          <p className="text-zinc-500 mb-8">
            Looks like you haven&apos;t added any premium selections to your
            cart yet.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center bg-primary-red hover:bg-black text-white px-8 py-4 text-sm font-bold tracking-widest uppercase transition-colors rounded-full shadow-lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Start Shopping</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-zinc-900">
          Your Cart
        </h1>
        <span className="bg-gray-100 text-zinc-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
          {itemsCount} {itemsCount === 1 ? "Item" : "Items"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Item List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 sm:p-6">
            <div className="divide-y divide-gray-100">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="py-6 flex flex-col sm:flex-row sm:items-center gap-6 group"
                >
                  {/* Product Image */}
                  <div className="relative w-28 h-28 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden shrink-0 mx-auto sm:mx-0">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-contain p-3 group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  {/* Info & Actions combined for sleeker UI */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-primary-red uppercase tracking-widest mb-1 block">
                          {item.category || item.brand}
                        </span>
                        <Link href={`/product/${item.id}`} className="block">
                          <h3 className="text-lg font-bold text-zinc-900 leading-tight hover:text-primary-red transition-colors capitalize">
                            {item.name}
                          </h3>
                        </Link>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          {formatUGX(item.price_ugx)} each
                        </p>
                      </div>

                      <div className="text-right w-full sm:w-auto">
                        <p className="text-xl font-black text-black">
                          {formatUGX(item.price_ugx * item.quantity)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50/50">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="p-2 text-zinc-500 hover:text-black hover:bg-white rounded-l-lg transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 font-black text-sm text-zinc-900 min-w-10 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="p-2 text-zinc-500 hover:text-black hover:bg-white rounded-r-lg transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="flex items-center text-xs font-bold text-gray-400 hover:text-primary-red transition-colors uppercase tracking-widest px-3 py-2 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center text-zinc-500 font-bold uppercase tracking-widest text-xs hover:text-black transition-colors px-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {/* Right: Premium Order Summary Card */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 sm:p-8 sticky top-32">
            <h2 className="text-lg font-black uppercase tracking-widest mb-6">
              Order Summary
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm text-zinc-600 font-medium">
                <span>Subtotal</span>
                <span className="text-zinc-900 font-bold">
                  {formatUGX(subtotal)}
                </span>
              </div>

              {/* Updated Shipping Info */}
              <div className="flex justify-between text-sm text-zinc-600 font-medium pb-6 border-b border-gray-100">
                <span className="flex items-center">Delivery</span>
                <span className="text-xs text-zinc-400 text-right">
                  Calculated at checkout
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                  Total
                </span>
                <span className="text-2xl font-black text-primary-red">
                  {formatUGX(subtotal)}
                </span>
              </div>
            </div>

            {/* Free Shipping Progress Indicator */}
            <div className="mb-8 bg-gray-50 rounded-xl p-4 border border-gray-100">
              {subtotal >= 500000 ? (
                <div className="flex items-center text-success-green">
                  <Truck className="h-5 w-5 mr-3" />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    You&apos;ve unlocked Free Delivery!
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                    <span>Free Delivery</span>
                    <span>Need {formatUGX(500000 - subtotal)} more</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-primary-red h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((subtotal / 500000) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={isRedirecting}
              className="w-full bg-black hover:bg-zinc-800 text-white py-5 font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center rounded-xl shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            <div className="mt-6 flex flex-col items-center">
              <div className="flex items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">
                <ShieldCheck className="h-4 w-4 mr-1 text-success-green" />
                <span>256-bit Encrypted Handshake</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;    
