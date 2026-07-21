"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, Loader2, ShieldCheck, Truck,
  MessageCircle, CreditCard, Package,
  MapPin, User, ChevronRight,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatUGX } from "@/lib/utils";
import { PESAPAL_SURCHARGE_RATE, qualifiesForFreeDelivery, DELIVERY_FEE } from "@/lib/constants";
import LocationPicker, { PickedLocation } from "@/components/shared/LocationPicker";

type PaymentMethod = "pesapal" | "cod";

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  paymentMethod: PaymentMethod;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface DeliveryQuote {
  feeUgx: number;
  distanceKm: number;
  durationMin: number;
  storeName: string;
}

type QuoteState = "idle" | "loading" | "ok" | "fallback";

// ── Helpers ───────────────────────────────────────────────────────────────────

function InputField({
  label, name, type = "text", placeholder, required, value, onChange, error, prefix,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  required?: boolean; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string; prefix?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
        {label}{required && <span className="text-primary-red ml-0.5">*</span>}
      </label>
      <div className="relative flex">
        {prefix && (
          <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-xs font-bold text-zinc-500">
            {prefix}
          </span>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full h-11 px-4 text-sm bg-gray-50 border text-zinc-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary-red/20 focus:border-primary-red transition-all
            ${prefix ? "rounded-r-xl" : "rounded-xl"}
            ${error ? "border-primary-red bg-red-50/60" : "border-gray-200"}`}
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-primary-red font-medium">{error}</p>}
    </div>
  );
}

function SectionCard({ number, title, icon: Icon, children }: {
  number: number; title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="w-7 h-7 rounded-full bg-kafunda-green text-white flex items-center justify-center text-xs font-black shrink-0">
          {number}
        </div>
        <Icon className="h-4 w-4 text-zinc-400" />
        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/** Generate a fresh UUID for the idempotency key (server uses this to dedupe). */
function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `kaf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Processing overlay (shows while we hand off to Pesapal) ─────────────────────
function ProcessingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-kafunda-green-deep/95 backdrop-blur-sm px-6">
      <div className="text-center max-w-sm">
        <div className="relative mx-auto mb-8 h-20 w-20">
          {/* spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-white/15" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-kafunda-mustard animate-spin" />
          {/* pulsing card icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <CreditCard className="h-8 w-8 text-white animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">
          {message}
        </h2>
        <p className="text-sm text-white/70 leading-relaxed">
          Please don&apos;t close or refresh this page — we&apos;re taking you to Pesapal
          to complete your payment securely.
        </p>
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-bold text-white/50 uppercase tracking-widest">
          <ShieldCheck className="h-4 w-4 text-kafunda-mustard" />
          Secure &amp; Encrypted
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { cart, subtotal, itemsCount, clearCart } = useCart();
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false); // Pesapal hand-off overlay
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [serverError, setServerError] = useState("");

  const [form, setForm] = useState<FormData>({
    firstName: "", lastName: "", phone: "", email: "",
    address: "", notes: "",
    paymentMethod: "pesapal",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Pinned delivery location + live quote
  const [pin, setPin] = useState<PickedLocation | null>(null);
  const [pinLabel, setPinLabel] = useState("");
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoteState, setQuoteState] = useState<QuoteState>("idle");
  const [codFeeAtOrder, setCodFeeAtOrder] = useState(0);

  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    setIsMounted(true);
    setIdempotencyKey(newIdempotencyKey());
  }, []);

  // ── Live delivery quote whenever the pin moves ──────────────────────────────
  useEffect(() => {
    if (!pin) return;
    let cancelled = false;
    setQuoteState("loading");

    (async () => {
      try {
        const res = await fetch("/api/delivery/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pin.lat, lng: pin.lng }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data?.ok && data.quote) {
          setQuote(data.quote);
          setQuoteState("ok");
        } else {
          setQuote(null);
          setQuoteState("fallback");
        }
      } catch {
        if (!cancelled) {
          setQuote(null);
          setQuoteState("fallback");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [pin]);

  // ── Free delivery over the threshold ────────────────────────────────────────
  // Mirrors the server (constants.ts / qualifiesForFreeDelivery) so the price
  // the customer SEES matches what Pesapal actually charges. Without this the
  // summary showed a delivery fee the server had already waived.
  const freeDelivery = qualifiesForFreeDelivery(subtotal);
  const rawDeliveryFee = quoteState === "ok" && quote ? quote.feeUgx : 0;
  const deliveryFee = freeDelivery ? 0 : rawDeliveryFee;
  const amountToFreeDelivery = Math.max(
    0,
    DELIVERY_FEE.FREE_DELIVERY_THRESHOLD_UGX - subtotal
  );

  const surcharge =
    form.paymentMethod === "pesapal"
      ? Math.round((subtotal + deliveryFee) * PESAPAL_SURCHARGE_RATE)
      : 0;
  const total = subtotal + deliveryFee + surcharge;

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim())  e.lastName  = "Required";
    if (!form.phone.trim()) {
      e.phone = "Phone number is required.";
    } else if (!/^(\+?256|0)?[7][0-9]{8}$/.test(form.phone.replace(/\s/g, ""))) {
      e.phone = "Enter a valid Ugandan number (e.g. 0712 345 678)";
    }
    if (!form.email.trim()) {
      e.email = "Email is required for your order receipt.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Enter a valid email address.";
    }
    if (!form.address.trim()) e.address = "Delivery address is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name as keyof FormErrors]) setErrors((p) => ({ ...p, [name]: undefined }));
    if (serverError) setServerError("");
  };

  function buildPayload() {
    return {
      customer: {
        firstName: form.firstName, lastName: form.lastName,
        phone: form.phone, email: form.email,
        address: form.address,
        location: pin,
        locationLabel: pinLabel,
        notes: form.notes,
      },
      cart: cart.map((i) => ({ id: i.id, quantity: i.quantity })),
      idempotencyKey,
    };
  }

  // ── COD ─────────────────────────────────────────────────────────────────────
  async function handleCOD() {
    const res = await fetch("/api/checkout/cod", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    if (!res.ok || !data.wc_order_id) {
      throw new Error(data.error || "Order could not be created. Please try again or contact support.");
    }
    clearCart();
    setCodFeeAtOrder(typeof data.delivery_fee === "number" ? data.delivery_fee : 0);
    setOrderNumber(data.order_number || `KAF-${data.wc_order_id}`);
    setIsSuccess(true);
  }

  // ── Pesapal ─────────────────────────────────────────────────────────────────
  async function handlePesapal() {
    const res = await fetch("/api/checkout/pesapal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    if (!res.ok || !data.redirect_url) {
      throw new Error(data.error || "Could not start Pesapal payment. Please try again.");
    }
    // Keep the processing overlay up through the browser navigation.
    setIsRedirecting(true);
    window.location.href = data.redirect_url;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (quoteState !== "ok" || !quote) {
      setServerError(
        quoteState === "fallback"
          ? "We can't deliver to that pin (it may be outside our delivery range). Please pin a location within Kampala."
          : "Please pin your delivery location so we can calculate your delivery fee before checkout."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setIsSubmitting(true);
    setServerError("");
    try {
      if (form.paymentMethod === "pesapal") await handlePesapal();
      else                                  await handleCOD();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIdempotencyKey(newIdempotencyKey());
      setIsRedirecting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (!isMounted) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary-red" />
    </div>
  );

  if (itemsCount === 0 && !isSuccess) return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <div className="bg-gray-50 rounded-2xl p-12 max-w-md mx-auto border border-gray-100">
        <h1 className="text-2xl font-black uppercase tracking-tighter mb-4">Your Cart is Empty</h1>
        <p className="text-zinc-500 mb-8">Add products before checking out.</p>
        <Link href="/shop"
          className="inline-flex items-center bg-kafunda-green hover:bg-kafunda-green-deep text-white px-8 py-4 text-sm font-bold tracking-widest uppercase transition-colors rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop
        </Link>
      </div>
    </div>
  );

  // ── COD success screen ───────────────────────────────────────────────────────
  if (isSuccess) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <CheckCircle className="h-20 w-20 text-success-green mx-auto mb-6" />
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-3">Order Placed!</h1>
        <p className="text-zinc-500 mb-2 font-medium">
          Order <span className="font-black text-zinc-900">{orderNumber}</span> received.
        </p>
        <p className="text-zinc-500 mb-8 font-medium">
          {codFeeAtOrder > 0 ? (
            <>Our team will call <span className="font-bold text-zinc-900">{form.phone}</span> within 1-2 hours to confirm your order. Your total, including the <span className="font-bold text-zinc-900">{formatUGX(codFeeAtOrder)}</span> delivery fee, is paid in cash on arrival.</>
          ) : (
            <>Our team will call <span className="font-bold text-zinc-900">{form.phone}</span> within 1-2 hours to confirm your order{freeDelivery ? " — your order qualifies for free delivery." : " and the delivery fee for your area."}</>
          )}
        </p>
        <a href={`https://wa.me/256785498279?text=Hi! I just placed order ${orderNumber} on the Kafunda website.`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors mb-4 w-full justify-center">
          <MessageCircle className="h-4 w-4" /> Confirm on WhatsApp
        </a>
        <Link href="/shop" className="inline-flex items-center gap-2 text-zinc-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors">
          <ArrowLeft className="h-4 w-4" /> Continue Shopping
        </Link>
      </div>
    </div>
  );

  // ── Main checkout form ───────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Processing overlay during Pesapal hand-off */}
      {isRedirecting && <ProcessingOverlay message="Processing your payment…" />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/cart"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors">
            <ArrowLeft className="h-4 w-4" /> Cart
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <span className="text-xs font-black uppercase tracking-widest text-zinc-900">Checkout</span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

            {/* ── Left: Form sections ── */}
            <div className="lg:col-span-7 space-y-5">

              {/* Section 1: Contact */}
              <SectionCard number={1} title="Contact Information" icon={User}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="First Name" name="firstName" placeholder="Joshua" required
                    value={form.firstName} onChange={handleChange} error={errors.firstName} />
                  <InputField label="Last Name" name="lastName" placeholder="Kyayi" required
                    value={form.lastName} onChange={handleChange} error={errors.lastName} />
                  <InputField label="Phone Number" name="phone" type="tel" placeholder="0712 345 678"
                    required value={form.phone} onChange={handleChange} error={errors.phone} prefix="UG" />
                  <InputField label="Email Address" name="email" type="email" placeholder="you@example.com"
                    required value={form.email} onChange={handleChange} error={errors.email} />
                </div>
              </SectionCard>

              {/* Section 2: Delivery */}
              <SectionCard number={2} title="Delivery Details" icon={MapPin}>
                <div className="space-y-5">
                  <InputField label="Street Address / Building" name="address"
                    placeholder="Plot 14, Acacia Ave, Kololo" required
                    value={form.address} onChange={handleChange} error={errors.address} />

                  {/* Pin location → instant delivery fee */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                      Pin Your Location <span className="text-gray-400 font-normal normal-case tracking-normal text-[10px]">(for an instant delivery fee)</span>
                    </label>
                    <LocationPicker
                      onChange={(loc, label) => {
                        setPin(loc);
                        if (label) setPinLabel(label);
                      }}
                    />

                    {/* Quote status */}
                    {quoteState === "loading" && (
                      <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3">
                        <Loader2 className="h-4 w-4 text-zinc-400 animate-spin shrink-0" />
                        <p className="text-[11px] text-zinc-500 font-medium">Calculating your delivery fee…</p>
                      </div>
                    )}
                    {quoteState === "ok" && quote && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-kafunda-green-tint border border-kafunda-green/20 px-3.5 py-3">
                        <Truck className="h-4 w-4 text-kafunda-green mt-0.5 shrink-0" />
                        <p className="text-[11px] leading-relaxed text-kafunda-green-deep font-medium">
                          {freeDelivery ? (
                            <>
                              Delivery is <span className="font-black uppercase">free</span> on this order —
                              {" "}{quote.distanceKm} km (~{quote.durationMin} min ride) from {quote.storeName}.
                            </>
                          ) : (
                            <>
                              Delivery to your pin: <span className="font-black">{formatUGX(quote.feeUgx)}</span> — {quote.distanceKm} km
                              (~{quote.durationMin} min ride) from {quote.storeName}.{" "}
                              {form.paymentMethod === "cod"
                                ? "Paid in cash with your order on arrival."
                                : "Included in your payment below."}
                            </>
                          )}
                        </p>
                      </div>
                    )}
                    {(quoteState === "idle" || quoteState === "fallback") && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-amber-50/70 border border-amber-100 px-3.5 py-3">
                        <Truck className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                          {quoteState === "fallback"
                            ? "We can't calculate a fee for that pin — it may be outside our delivery range, or the map service is busy. Please pin a location within Kampala to continue."
                            : "We deliver across Kampala. Pin your exact location above to calculate your delivery fee — it's required to place an order."}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                      Delivery Notes <span className="text-gray-400 font-normal normal-case tracking-normal text-[10px]">(optional)</span>
                    </label>
                    <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                      placeholder="Gate codes, landmarks, or any special instructions..."
                      className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-red/20 focus:border-primary-red transition-all resize-none" />
                  </div>
                </div>
              </SectionCard>

              {/* Section 3: Payment */}
              <SectionCard number={3} title="Payment Method" icon={CreditCard}>
                <div className="space-y-3">

                  {/* Pesapal */}
                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.paymentMethod === "pesapal" ? "border-kafunda-green bg-kafunda-green-tint/40" : "border-gray-100 hover:border-gray-200 bg-white"
                  }`}>
                    <input type="radio" name="paymentMethod" value="pesapal"
                      checked={form.paymentMethod === "pesapal"} onChange={handleChange}
                      className="mt-1 accent-kafunda-green shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className={`h-4 w-4 ${form.paymentMethod === "pesapal" ? "text-kafunda-green" : "text-gray-400"}`} />
                        <p className="text-sm font-bold text-zinc-900">Pay Online via Pesapal</p>
                      </div>
                      <p className="text-xs text-zinc-500 mb-2">
                        {quoteState === "ok"
                          ? "Pay for your items and delivery now — nothing to settle on arrival."
                          : "Pay for your items now. Delivery is settled separately on the confirmation call."}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {["MTN MoMo", "Airtel Money", "Visa", "Mastercard"].map((b) => (
                          <span key={b} className="text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>

                  {/* COD */}
                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.paymentMethod === "cod" ? "border-zinc-800 bg-zinc-50/50" : "border-gray-100 hover:border-gray-200 bg-white"
                  }`}>
                    <input type="radio" name="paymentMethod" value="cod"
                      checked={form.paymentMethod === "cod"} onChange={handleChange}
                      className="mt-1 accent-zinc-900 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className={`h-4 w-4 ${form.paymentMethod === "cod" ? "text-zinc-800" : "text-gray-400"}`} />
                        <p className="text-sm font-bold text-zinc-900">Cash on Delivery</p>
                      </div>
                      <p className="text-xs text-zinc-500">Pay for items plus delivery in cash when your order arrives.</p>
                    </div>
                  </label>
                </div>
              </SectionCard>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden sticky top-24">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800">Order Summary</h2>
                </div>

                {/* Items */}
                <div className="px-6 py-4 max-h-60 overflow-y-auto space-y-3 border-b border-gray-100">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                        <Image src={item.image_url} alt={item.name} fill className="object-contain p-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-900 line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-xs font-black text-zinc-900 shrink-0">
                        {formatUGX(item.price_ugx * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="px-6 py-4 space-y-3 border-b border-gray-100">
                  <div className="flex justify-between text-sm text-zinc-500 font-medium">
                    <span>Subtotal ({itemsCount} items)</span>
                    <span className="font-bold text-zinc-800">{formatUGX(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-500 font-medium">
                    <span>Delivery{quoteState === "ok" && quote && !freeDelivery ? ` · ${quote.distanceKm} km` : ""}</span>
                    {freeDelivery ? (
                      <span className="font-black text-kafunda-green uppercase text-xs">Free</span>
                    ) : quoteState === "ok" && quote ? (
                      <span className="font-bold text-zinc-800">{formatUGX(quote.feeUgx)}</span>
                    ) : (
                      <span className="text-zinc-400 italic text-xs text-right">Pin location to calculate</span>
                    )}
                  </div>

                  {/* Nudge: how much more to unlock free delivery */}
                  {!freeDelivery && subtotal > 0 && amountToFreeDelivery > 0 && (
                    <p className="text-[10px] text-kafunda-green font-semibold">
                      Add {formatUGX(amountToFreeDelivery)} more to get free delivery.
                    </p>
                  )}

                  {/* Online payment charge line (Pesapal only) */}
                  {form.paymentMethod === "pesapal" && surcharge > 0 && (
                    <div className="flex justify-between text-sm text-zinc-500 font-medium">
                      <span>Online payment charge (3.5%)</span>
                      <span className="font-bold text-zinc-800">{formatUGX(surcharge)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
                    <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">Total Due Now</span>
                    <span className="text-2xl font-black text-kafunda-green">
                      {formatUGX(form.paymentMethod === "cod" ? subtotal : total)}
                    </span>
                  </div>
                </div>

                {/* Error */}
                {serverError && (
                  <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-primary-red font-medium leading-relaxed">
                    {serverError}
                  </div>
                )}

                {/* Submit */}
                <div className="px-6 pb-6 pt-4">
                  <button type="submit" disabled={isSubmitting || !idempotencyKey || quoteState !== "ok"}
                    className={`w-full py-4 font-bold text-sm tracking-widest uppercase rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed
                      ${form.paymentMethod === "cod"
                        ? "bg-zinc-900 hover:bg-black text-white"
                        : "bg-kafunda-green hover:bg-kafunda-green-deep text-white"
                    }`}>
                    {isSubmitting ? (
                      <><Loader2 className="h-5 w-5 animate-spin" />
                        {form.paymentMethod === "pesapal" ? "Redirecting to Pesapal..." : "Placing Order..."}
                      </>
                    ) : form.paymentMethod === "pesapal" ? (
                      <>{formatUGX(total)} · Pay via Pesapal</>
                    ) : (
                      `Place Order${quoteState === "ok" ? ` · ${formatUGX(subtotal + deliveryFee)} on arrival` : ""}`
                    )}
                  </button>

                  {form.paymentMethod === "pesapal" && (
                    <p className="mt-2 text-center text-[10px] text-zinc-400 font-medium">
                      You&apos;ll be securely redirected to Pesapal to complete payment.
                    </p>
                  )}

                  <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <ShieldCheck className="h-4 w-4 text-success-green" />
                    Secure &amp; Encrypted
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}