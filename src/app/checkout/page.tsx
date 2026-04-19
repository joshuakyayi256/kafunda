"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Truck,
  MessageCircle,
  CreditCard,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatUGX } from "@/lib/utils";
import { DELIVERY_ZONES } from "@/lib/constants";

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  deliveryZone: string;
  notes: string;
  paymentMethod: "cod" | "mobile_money";
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  deliveryZone?: string;
}

const FREE_DELIVERY_THRESHOLD = 500_000;

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, subtotal, itemsCount, clearCart } = useCart();
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    deliveryZone: "",
    notes: "",
    paymentMethod: "cod",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const selectedZone = DELIVERY_ZONES.find((z) => z.id === form.deliveryZone);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (selectedZone?.fee ?? 0);
  const total = subtotal + deliveryFee;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!form.lastName.trim()) newErrors.lastName = "Last name is required.";

    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!/^(\+?256|0)?[7][0-9]{8}$/.test(form.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Enter a valid Ugandan phone number (e.g. 0712345678).";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!form.address.trim()) newErrors.address = "Delivery address is required.";
    if (!form.deliveryZone) newErrors.deliveryZone = "Please select your delivery zone.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear the error for this field as the user types
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    // TODO: Replace this with Firebase order submission once keys are received.
    // For now we simulate a 1.5s network call and generate an order number.
    await new Promise((res) => setTimeout(res, 1500));

    const generatedOrderNumber = `KAF-${Date.now().toString().slice(-6)}`;
    setOrderNumber(generatedOrderNumber);
    clearCart();
    setIsSuccess(true);
    setIsSubmitting(false);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-red" />
      </div>
    );
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-20 w-20 text-success-green" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-3">
            Order Placed!
          </h1>
          <p className="text-zinc-500 mb-2 font-medium">
            Your order <span className="font-black text-zinc-900">{orderNumber}</span> has been received.
          </p>
          <p className="text-zinc-500 mb-8 font-medium">
            Our team will call you on{" "}
            <span className="font-bold text-zinc-900">{form.phone}</span> to confirm
            delivery within 1–2 hours.
          </p>
          <a
            href={`https://wa.me/256785498279?text=Hi! I just placed order ${orderNumber} on the Kafunda website.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors mb-4 w-full justify-center"
          >
            <MessageCircle className="h-4 w-4" />
            Confirm on WhatsApp
          </a>
          <button
            onClick={() => router.push("/shop")}
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  // ── Empty cart guard ────────────────────────────────────────────────────────
  if (itemsCount === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="bg-gray-50 rounded-2xl p-12 max-w-2xl mx-auto border border-gray-100">
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">
            Your Cart is Empty
          </h1>
          <p className="text-zinc-500 mb-8">Add some products before checking out.</p>
          <Link
            href="/shop"
            className="inline-flex items-center bg-primary-red hover:bg-black text-white px-8 py-4 text-sm font-bold tracking-widest uppercase transition-colors rounded-full shadow-lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  // ── Field helper ────────────────────────────────────────────────────────────
  const Field = ({
    label,
    name,
    type = "text",
    placeholder,
    required = false,
  }: {
    label: string;
    name: keyof FormData;
    type?: string;
    placeholder?: string;
    required?: boolean;
  }) => (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">
        {label} {required && <span className="text-primary-red">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={form[name] as string}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full h-11 px-4 text-sm bg-gray-50 border rounded-xl text-zinc-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-red/20 focus:border-primary-red transition-all ${
          errors[name as keyof FormErrors] ? "border-primary-red bg-red-50" : "border-gray-200"
        }`}
      />
      {errors[name as keyof FormErrors] && (
        <p className="mt-1 text-xs text-primary-red font-medium">
          {errors[name as keyof FormErrors]}
        </p>
      )}
    </div>
  );

  // ── Main checkout layout ────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back link */}
      <Link
        href="/cart"
        className="inline-flex items-center text-zinc-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Cart
      </Link>

      <h1 className="text-3xl font-black uppercase tracking-tighter mb-10">Checkout</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* ── Left: Form ── */}
          <div className="lg:col-span-7 space-y-8">
            {/* Contact */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <h2 className="text-sm font-black uppercase tracking-widest mb-6 pb-4 border-b border-gray-100">
                Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="First Name" name="firstName" placeholder="Joshua" required />
                <Field label="Last Name" name="lastName" placeholder="Kyayi" required />
                <Field label="Phone Number" name="phone" type="tel" placeholder="0712 345 678" required />
                <Field label="Email Address" name="email" type="email" placeholder="you@example.com" />
              </div>
            </section>

            {/* Delivery */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <h2 className="text-sm font-black uppercase tracking-widest mb-6 pb-4 border-b border-gray-100">
                Delivery Details
              </h2>
              <div className="space-y-5">
                <Field
                  label="Street Address / Building"
                  name="address"
                  placeholder="Plot 14, Acacia Ave, Kololo"
                  required
                />

                {/* Delivery Zone Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">
                    Delivery Zone <span className="text-primary-red">*</span>
                  </label>
                  <div className="space-y-2">
                    {DELIVERY_ZONES.map((zone) => (
                      <label
                        key={zone.id}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          form.deliveryZone === zone.id
                            ? "border-primary-red bg-red-50/40"
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="deliveryZone"
                            value={zone.id}
                            checked={form.deliveryZone === zone.id}
                            onChange={handleChange}
                            className="accent-primary-red"
                          />
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{zone.name}</p>
                            <p className="text-xs text-zinc-500">{zone.areas}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-black shrink-0 ml-3 ${
                          subtotal >= FREE_DELIVERY_THRESHOLD ? "text-success-green line-through" : "text-zinc-900"
                        }`}>
                          {subtotal >= FREE_DELIVERY_THRESHOLD ? "Free" : formatUGX(zone.fee)}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.deliveryZone && (
                    <p className="mt-1 text-xs text-primary-red font-medium">{errors.deliveryZone}</p>
                  )}
                  {subtotal >= FREE_DELIVERY_THRESHOLD && (
                    <p className="mt-2 text-xs text-success-green font-bold">
                      🎉 Free delivery on your order!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">
                    Delivery Notes <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
                  </label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Any gate codes, landmarks, or special instructions…"
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-red/20 focus:border-primary-red transition-all resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <h2 className="text-sm font-black uppercase tracking-widest mb-6 pb-4 border-b border-gray-100">
                Payment Method
              </h2>
              <div className="space-y-3">
                {[
                  { value: "cod", label: "Cash on Delivery", sub: "Pay when your order arrives at your door.", icon: <Truck className="h-5 w-5" /> },
                  { value: "mobile_money", label: "Mobile Money", sub: "MTN MoMo or Airtel Money — our agent will send you a payment prompt.", icon: <CreditCard className="h-5 w-5" /> },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.paymentMethod === opt.value
                        ? "border-primary-red bg-red-50/40"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={opt.value}
                      checked={form.paymentMethod === opt.value}
                      onChange={handleChange}
                      className="mt-0.5 accent-primary-red"
                    />
                    <div className={`mt-0.5 ${form.paymentMethod === opt.value ? "text-primary-red" : "text-gray-400"}`}>
                      {opt.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{opt.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 sm:p-8 sticky top-28">
              <h2 className="text-sm font-black uppercase tracking-widest mb-6 pb-4 border-b border-gray-100">
                Order Summary
              </h2>

              {/* Items */}
              <ul className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-zinc-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-black text-zinc-900 shrink-0">
                      {formatUGX(item.price_ugx * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Totals */}
              <div className="space-y-3 border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between text-sm text-zinc-600 font-medium">
                  <span>Subtotal</span>
                  <span className="font-bold text-zinc-900">{formatUGX(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-600 font-medium">
                  <span>Delivery{selectedZone ? ` · ${selectedZone.name}` : ""}</span>
                  {!form.deliveryZone ? (
                    <span className="text-zinc-400 italic text-xs">Select zone</span>
                  ) : deliveryFee === 0 ? (
                    <span className="text-success-green font-bold">Free</span>
                  ) : (
                    <span className="font-bold text-zinc-900">{formatUGX(deliveryFee)}</span>
                  )}
                </div>
                <div className="flex justify-between items-baseline pt-3 border-t border-gray-100">
                  <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">Total</span>
                  <span className="text-2xl font-black text-primary-red">{formatUGX(total)}</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary-red hover:bg-primary-red-hover disabled:opacity-70 disabled:cursor-not-allowed text-white py-4 font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center rounded-xl shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Placing Order…
                  </>
                ) : (
                  `Place Order · ${formatUGX(total)}`
                )}
              </button>

              <div className="mt-5 flex items-center justify-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4 mr-1.5 text-success-green" />
                Your information is secure
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
