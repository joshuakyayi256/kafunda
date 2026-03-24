"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, CheckCircle2, CreditCard, Wallet, Banknote, Smartphone } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatUGX } from "@/lib/utils";

const CheckoutPage = () => {
    const { cart, itemsCount, subtotal } = useCart();
    const router = useRouter();

    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (itemsCount === 0 && !showSuccess) {
            router.push("/cart");
        }
    }, [itemsCount, router, showSuccess]);

    const shipping = subtotal > 500000 ? 0 : 25000;
    const total = subtotal + shipping;

    const handlePayNow = () => {
        if (!paymentMethod) {
            alert("Please select a payment method");
            return;
        }
        setShowSuccess(true);
        // In a real app, this would trigger the actual payment process
    };

    if (showSuccess) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="flex justify-center mb-8">
                    <div className="bg-emerald-100 p-6 rounded-full">
                        <CheckCircle2 className="h-16 w-16 text-success-green" />
                    </div>
                </div>
                <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">Order Confirmed!</h1>
                <p className="text-zinc-500 mb-10">
                    Your premium selection from Kafunda is being prepared.
                    Check your email for the receipt and delivery details.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center bg-primary-red hover:bg-primary-red-hover text-white px-10 py-4 text-sm font-bold tracking-widest uppercase transition-all shadow-xl"
                >
                    <span>Return to Shop</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Minimalist Header */}
            <header className="border-b border-gray-100 py-6">
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <Link href="/" className="text-3xl font-black tracking-tighter uppercase text-black">
                        Kafunda
                    </Link>
                    <Link href="/cart" className="flex items-center text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        <span>Return to Cart</span>
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Left: Forms */}
                    <div className="lg:col-span-7 space-y-12">
                        {/* Contact Info */}
                        <section>
                            <h2 className="text-xl font-black uppercase tracking-tighter mb-6">Contact Information</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        className="w-full bg-gray-50 border-0 rounded-md p-4 focus:ring-2 focus:ring-primary-red focus:outline-none placeholder:text-gray-300"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" id="news" className="h-4 w-4 text-primary-red rounded border-gray-300 focus:ring-primary-red" />
                                    <label htmlFor="news" className="ml-3 text-sm text-zinc-600 font-medium cursor-pointer">Email me with news and exclusive offers</label>
                                </div>
                            </div>
                        </section>

                        {/* Delivery Details */}
                        <section>
                            <h2 className="text-xl font-black uppercase tracking-tighter mb-6">Delivery Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">First Name</label>
                                    <input type="text" className="w-full bg-gray-50 border-0 rounded-md p-4 focus:ring-2 focus:ring-primary-red focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Last Name</label>
                                    <input type="text" className="w-full bg-gray-50 border-0 rounded-md p-4 focus:ring-2 focus:ring-primary-red focus:outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Address</label>
                                    <input type="text" placeholder="Street Address, Apartment, Suite, etc." className="w-full bg-gray-50 border-0 rounded-md p-4 focus:ring-2 focus:ring-primary-red focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">City</label>
                                    <input type="text" className="w-full bg-gray-50 border-0 rounded-md p-4 focus:ring-2 focus:ring-primary-red focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Postal Code (Optional)</label>
                                    <input type="text" className="w-full bg-gray-50 border-0 rounded-md p-4 focus:ring-2 focus:ring-primary-red focus:outline-none" />
                                </div>
                            </div>
                        </section>

                        {/* Payment Method */}
                        <section>
                            <h2 className="text-xl font-black uppercase tracking-tighter mb-6">Payment Method</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">All transactions are secure and encrypted.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <PaymentOption
                                    id="mtn"
                                    name="MTN Mobile Money"
                                    icon={<Smartphone className="h-6 w-6" />}
                                    selected={paymentMethod === "mtn"}
                                    onClick={() => setPaymentMethod("mtn")}
                                    description="Pay instantly using your MTN MoMo account."
                                >
                                    {paymentMethod === "mtn" && (
                                        <div className="mt-4 pt-4 border-t border-white/20 animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-[8px] font-bold uppercase tracking-widest mb-2">Mobile Money Number</label>
                                            <input
                                                type="text"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                placeholder="077XXXXXXX"
                                                className="w-full bg-white text-black border-0 rounded p-3 text-sm focus:ring-0 focus:outline-none"
                                            />
                                        </div>
                                    )}
                                </PaymentOption>

                                <PaymentOption
                                    id="airtel"
                                    name="Airtel Money"
                                    icon={<Smartphone className="h-6 w-6" />}
                                    selected={paymentMethod === "airtel"}
                                    onClick={() => setPaymentMethod("airtel")}
                                    description="Pay instantly using your Airtel Money account."
                                >
                                    {paymentMethod === "airtel" && (
                                        <div className="mt-4 pt-4 border-t border-white/20 animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-[8px] font-bold uppercase tracking-widest mb-2">Mobile Money Number</label>
                                            <input
                                                type="text"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                placeholder="075XXXXXXX"
                                                className="w-full bg-white text-black border-0 rounded p-3 text-sm focus:ring-0 focus:outline-none"
                                            />
                                        </div>
                                    )}
                                </PaymentOption>

                                <PaymentOption
                                    id="card"
                                    name="Credit / Debit Card"
                                    icon={<CreditCard className="h-6 w-6" />}
                                    selected={paymentMethod === "card"}
                                    onClick={() => setPaymentMethod("card")}
                                    description="Visa, Mastercard, American Express."
                                />

                                <PaymentOption
                                    id="cod"
                                    name="Cash on Delivery"
                                    icon={<Banknote className="h-6 w-6" />}
                                    selected={paymentMethod === "cod"}
                                    onClick={() => setPaymentMethod("cod")}
                                    description="Pay in cash when your order arrives."
                                />
                            </div>
                        </section>
                    </div>

                    {/* Right: Sticky Summary */}
                    <div className="lg:col-span-5">
                        <div className="bg-gray-50 rounded-xl p-8 sticky top-12">
                            <h2 className="text-xl font-black uppercase tracking-tighter mb-8 border-b border-gray-200 pb-4">Order Summary</h2>

                            {/* Item List */}
                            <div className="space-y-6 mb-8 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex items-center">
                                        <div className="relative w-16 h-20 bg-white rounded-md flex-shrink-0 border border-gray-200">
                                            <Image src={item.image_url} alt={item.name} fill className="object-contain p-2" />
                                            <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-50">
                                                {item.quantity}
                                            </span>
                                        </div>
                                        <div className="ml-4 flex-grow">
                                            <h4 className="text-sm font-bold text-zinc-900 leading-tight capitalize">{item.name}</h4>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">{item.brand}</p>
                                        </div>
                                        <p className="text-sm font-black text-black ml-4">
                                            {formatUGX(item.price_ugx * item.quantity)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Discount Code */}
                            <div className="flex space-x-2 mb-8 border-b border-gray-200 pb-8">
                                <input
                                    type="text"
                                    placeholder="Discount code or gift card"
                                    className="flex-grow bg-white border border-gray-200 rounded-md p-3 text-sm focus:ring-1 focus:ring-primary-red focus:outline-none"
                                />
                                <button className="bg-gray-200 hover:bg-gray-300 text-zinc-900 px-6 py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-colors">
                                    Apply
                                </button>
                            </div>

                            {/* Totals */}
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between text-sm font-medium text-zinc-500">
                                    <span>Subtotal</span>
                                    <span>{formatUGX(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium text-zinc-500 border-b border-gray-200 pb-4">
                                    <span>Shipping</span>
                                    <span className={shipping === 0 ? "text-success-green font-bold uppercase" : ""}>
                                        {shipping === 0 ? "Free" : formatUGX(shipping)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-baseline pt-2">
                                    <span className="text-xl font-black uppercase tracking-tighter">Total</span>
                                    <span className="text-3xl font-black text-black">{formatUGX(total)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePayNow}
                                className="w-full bg-primary-red hover:bg-primary-red-hover text-white py-6 font-bold text-sm tracking-widest uppercase transition-all shadow-xl transform active:scale-[0.98]"
                            >
                                Pay Now
                            </button>

                            <div className="mt-6 flex justify-center items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <ShieldCheck className="h-4 w-4 mr-1 text-success-green" />
                                <span>Secure Encrypted Checkout</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const PaymentOption = ({ id, name, icon, description, selected, onClick, children }: any) => (
    <button
        onClick={onClick}
        className={`w-full text-left p-6 rounded-xl border-2 transition-all duration-300 relative overflow-hidden flex flex-col ${selected
                ? "bg-emerald-500 border-emerald-500 text-white shadow-lg"
                : "bg-white border-gray-100 text-zinc-900 hover:border-gray-200"
            }`}
    >
        <div className="flex items-center justify-between mb-2">
            <div className={selected ? "text-white" : "text-zinc-400"}>
                {icon}
            </div>
            {selected && <CheckCircle2 className="h-5 w-5 text-white" />}
        </div>
        <h3 className="font-bold text-sm mb-1 uppercase tracking-tight">{name}</h3>
        <p className={`text-[10px] leading-tight ${selected ? "text-white/80" : "text-zinc-500"}`}>
            {description}
        </p>
        {children}
    </button>
);

export default CheckoutPage;
