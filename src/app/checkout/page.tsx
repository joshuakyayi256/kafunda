"use client";

import React, { useEffect, useRef, useState } from "react";
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
import PesapalModal, { cancelPesapalOrder } from "@/components/checkout/PesapalModal";

type PaymentMethod = "pesapal" | "cod";

/** Open Pesapal payment session, rendered in the on-page modal. */
interface PesapalSession {
  paymentUrl: string;
  orderRef: string;
  trackingId: string;
  amount: number;
}

/**
 * Unfinished payments are the biggest bucket of lost sales here: the customer
 * starts a payment, the browser or the network eats it, and the order sits
 * pending in Woo with nobody chasing it. The session is parked in
 * localStorage so the next visit to checkout offers it back in one tap
 * instead of asking them to build the whole order again.
 */
const PENDING_PAYMENT_KEY = "kafunda:pending-payment";
/** A Pesapal payment page goes stale; past this we stop offering to resume. */
const PENDING_PAYMENT_TTL_MS = 45 * 60 * 1000;

interface StoredPayment extends PesapalSession {
  savedAt: number;
}

function readPendingPayment(): StoredPayment | null {
  try {
    const raw = window.localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPayment>;
    if (!parsed.paymentUrl || !parsed.orderRef || !parsed.trackingId) return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > PENDING_PAYMENT_TTL_MS) {
      window.localStorage.removeItem(PENDING_PAYMENT_KEY);
      return null;
    }
    return parsed as StoredPayment;
  } catch {
    return null;
  }
}

function writePendingPayment(session: PesapalSession) {
  try {
    window.localStorage.setItem(
      PENDING_PAYMENT_KEY,
      JSON.stringify({ ...session, savedAt: Date.now() })
    );
  } catch {
    // Private mode / storage full — resuming is a bonus, never a requirement.
  }
}

function clearPendingPayment() {
  try {
    window.localStorage.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    // ignore
  }
}

interface FormData {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  paymentMethod: PaymentMethod;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

/** Field order on the page — the first invalid one gets focus. */
const FIELD_ORDER: (keyof FormErrors)[] = ["fullName", "phone", "email", "address"];

/** "Leo Ajule Mukasa" → first "Leo", last "Ajule Mukasa". One word → no last name. */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
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
  label, name, type = "text", placeholder, required, optional, value, onChange, error, prefix,
  autoComplete, inputMode,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  required?: boolean; optional?: boolean; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string; prefix?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  // Errors use real red (not the brand token — `primary-red` is green now),
  // so a problem never looks like a friendly hint.
  return (
    <div>
      <label htmlFor={name} className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
        {label}{required && <span className="text-red-600 ml-0.5">*</span>}
        {optional && <span className="ml-1 text-gray-400 font-normal normal-case tracking-normal text-[10px]">(optional)</span>}
      </label>
      <div className="relative flex">
        {prefix && (
          <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-xs font-bold text-zinc-500">
            {prefix}
          </span>
        )}
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`w-full h-12 px-4 text-base sm:text-sm bg-gray-50 border text-zinc-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2 transition-all
            ${prefix ? "rounded-r-xl" : "rounded-xl"}
            ${error
              ? "border-red-500 bg-red-50 focus:ring-red-500/20 focus:border-red-500"
              : "border-gray-200 focus:ring-kafunda-green/20 focus:border-kafunda-green"}`}
        />
      </div>
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1.5 text-xs text-red-600 font-semibold">
          {error}
        </p>
      )}
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { cart, subtotal, itemsCount, clearCart } = useCart();
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pesapal, setPesapal] = useState<PesapalSession | null>(null); // on-page payment modal
  const [resumable, setResumable] = useState<StoredPayment | null>(null); // unfinished payment from a previous visit
  const [offerCod, setOfferCod] = useState(false); // shown after a payment falls over
  const [isSuccess, setIsSuccess] = useState(false);
  const [paidOnline, setPaidOnline] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [serverError, setServerError] = useState("");

  const [form, setForm] = useState<FormData>({
    fullName: "", phone: "", email: "",
    address: "", notes: "",
    paymentMethod: "pesapal",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showNotes, setShowNotes] = useState(false);

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
    setResumable(readPendingPayment());

    // Back button from Pesapal can restore this page from the browser cache
    // with the button still "Opening…" — reset it and offer to resume.
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setIsSubmitting(false);
      setResumable(readPendingPayment());
      setIdempotencyKey(newIdempotencyKey());
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
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
  /** Validates the form. On failure, jumps to and focuses the first problem
   *  field and says so next to the Pay button — tapping Pay must never look
   *  like it did nothing. */
  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.fullName.trim()) e.fullName = "Please enter your name.";
    const phone = form.phone.replace(/[\s-]/g, "");
    if (!phone) {
      e.phone = "Please enter your phone number.";
    } else if (!/^(\+?256|0)?[7][0-9]{8}$/.test(phone)) {
      const digits = phone.replace(/\D/g, "").replace(/^256/, "").replace(/^0/, "");
      e.phone = digits.length < 9
        ? `This number is too short — it should have 10 digits, like 0712 345 678.`
        : "Please check this number — it should look like 0712 345 678.";
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "This email doesn't look right — or leave it empty.";
    }
    if (!form.address.trim() && !pinLabel) e.address = "Please tell us where to deliver (building, street or area).";
    setErrors(e);

    const first = FIELD_ORDER.find((k) => e[k]);
    if (first) {
      setServerError("Please fix the highlighted details above to continue.");
      const el = document.getElementById(first);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return false;
    }
    return true;
  };

  /** Pin missing / unpriced: bring the map into view instead of the page top. */
  const scrollToMap = () =>
    document.getElementById("delivery-pin")?.scrollIntoView({ behavior: "smooth", block: "center" });

  /** True once the customer types their own address — auto-fill then stops. */
  const addressTypedRef = useRef(false);

  /** Pin placed (Locate me / map / search): fill the address box for them. */
  const handlePinChange = (loc: PickedLocation, label: string) => {
    setPin(loc);
    if (!label) return;
    setPinLabel(label);
    const clean = label.replace(/,\s*Uganda$/i, "").trim();
    if (clean && clean !== "Pinned location" && !addressTypedRef.current) {
      setForm((p) => ({ ...p, address: clean }));
      setErrors((p) => (p.address ? { ...p, address: undefined } : p));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "address") addressTypedRef.current = value.trim() !== "";
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name as keyof FormErrors]) setErrors((p) => ({ ...p, [name]: undefined }));
    if (serverError) setServerError("");
  };

  function buildPayload() {
    return {
      customer: {
        ...splitName(form.fullName),
        phone: form.phone.replace(/[\s-]/g, ""), email: form.email.trim(),
        address: form.address.trim() || pinLabel,
        location: pin,
        locationLabel: pinLabel,
        notes: form.notes,
      },
      cart: cart.map((i) => ({ id: i.id, quantity: i.quantity })),
      idempotencyKey,
    };
  }

  /** Abandoned or declined payment: clear the session and let them retry with
   *  a fresh order (the old idempotency key is spent on the dead attempt).
   *  The cart is left untouched and cash on delivery is offered right there —
   *  a failed card is not a reason to lose the order. */
  function endPesapalSession(message: string) {
    setPesapal(null);
    clearPendingPayment();
    setResumable(null);
    setServerError(message);
    setOfferCod(true);
    setIdempotencyKey(newIdempotencyKey());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** One tap out of a failed online payment: same cart, same details, paid on
   *  arrival. Validation still runs — the form may have been edited since. */
  async function placeCodInstead() {
    if (isSubmitting) return;
    if (!validate()) return;
    if (quoteState !== "ok" || !quote) {
      setServerError("Please pin your delivery location on the map so we can calculate your delivery fee.");
      scrollToMap();
      return;
    }

    setForm((p) => ({ ...p, paymentMethod: "cod" }));
    setIsSubmitting(true);
    setServerError("");
    setOfferCod(false);
    try {
      await handleCOD();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIdempotencyKey(newIdempotencyKey());
      setOfferCod(true);
    } finally {
      setIsSubmitting(false);
    }
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
  // Payment happens in a modal over this page — the customer is never sent
  // away, so the form, the cart and the pinned location all survive a cancelled
  // or failed attempt. The tracking id is what lets the modal verify the
  // payment with Pesapal; without it there is nothing to confirm against, so
  // we fall back to the old hand-off rather than showing an unverifiable modal.
  async function handlePesapal() {
    const res = await fetch("/api/checkout/pesapal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Full-page Pesapal (not embedded): the embedded window depended on
      // third-party cookies, which iPhone Safari / private browsers block —
      // the payment page then spun forever and customers cancelled.
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    if (!res.ok || !data.redirect_url) {
      throw new Error(data.error || "Could not start Pesapal payment. Please try again.");
    }

    if (data.order_tracking_id) {
      // Parked first: if the customer comes back without finishing, checkout
      // offers "Resume payment" instead of losing the order.
      writePendingPayment({
        paymentUrl: data.redirect_url,
        orderRef: data.merchant_reference || `KAF-${data.wc_order_id}`,
        trackingId: data.order_tracking_id,
        amount: total,
      });
    }
    // Pesapal's secure page → back to /checkout/success, which verifies.
    // isSubmitting stays on (button shows "Opening…") until the page leaves.
    window.location.assign(data.redirect_url);
    await new Promise(() => {}); // never resolves: keeps the spinner until navigation
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (quoteState !== "ok" || !quote) {
      setServerError(
        quoteState === "loading"
          ? "Still calculating your delivery fee — give it a second and tap again."
          : quoteState === "fallback"
            ? "We can't deliver to that pin (it may be outside our delivery range). Please pin a location within Kampala."
            : "Please pin your delivery location on the map so we can calculate your delivery fee."
      );
      scrollToMap();
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
      setPesapal(null);
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

  // ── Success screen (COD placed, or Pesapal payment confirmed in the modal) ───
  if (isSuccess) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <CheckCircle className="h-20 w-20 text-success-green mx-auto mb-6" />
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-3">
          {paidOnline ? "Payment Confirmed!" : "Order Placed!"}
        </h1>
        <p className="text-zinc-500 mb-2 font-medium">
          Order <span className="font-black text-zinc-900">{orderNumber}</span> received.
        </p>
        <p className="text-zinc-500 mb-8 font-medium">
          {paidOnline ? (
            <>Your payment went through and your order is being prepared. Our team will call <span className="font-bold text-zinc-900">{form.phone}</span> to confirm delivery.</>
          ) : codFeeAtOrder > 0 ? (
            <>Our team will call <span className="font-bold text-zinc-900">{form.phone}</span> within 1-2 hours to confirm your order. Your total, including the <span className="font-bold text-zinc-900">{formatUGX(codFeeAtOrder)}</span> delivery fee, is paid in cash on arrival.</>
          ) : (
            <>Our team will call <span className="font-bold text-zinc-900">{form.phone}</span> within 1-2 hours to confirm your order{freeDelivery ? " — your order qualifies for free delivery." : " and the delivery fee for your area."}</>
          )}
        </p>
        <a href={`https://wa.me/256785498279?text=Hi! I just ${paidOnline ? `paid for order ${orderNumber}` : `placed order ${orderNumber}`} on the Kafunda website.`}
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
      {/* Pesapal payment, on this page — no redirect away from checkout. */}
      {pesapal && (
        <PesapalModal
          paymentUrl={pesapal.paymentUrl}
          orderRef={pesapal.orderRef}
          trackingId={pesapal.trackingId}
          amountLabel={formatUGX(pesapal.amount)}
          onCompleted={() => {
            clearCart();
            clearPendingPayment();
            setResumable(null);
            setOfferCod(false);
            setOrderNumber(pesapal.orderRef);
            setPaidOnline(true);
            setPesapal(null);
            setIsSuccess(true);
          }}
          onFailed={(message) => endPesapalSession(message)}
          onDismiss={() =>
            endPesapalSession(
              "Payment cancelled. Your cart is saved — tap Pay to try again, or pay cash on delivery."
            )
          }
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-36 lg:py-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/cart"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors">
            <ArrowLeft className="h-4 w-4" /> Cart
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <span className="text-xs font-black uppercase tracking-widest text-zinc-900">Checkout</span>
        </div>

        {/* Unfinished payment from an earlier attempt — one tap back into it. */}
        {resumable && !pesapal && !isSuccess && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border-2 border-kafunda-green/30 bg-kafunda-green-tint/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                <CreditCard className="h-4 w-4 text-kafunda-green" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight text-zinc-900">
                  Finish your payment
                </p>
                <p className="text-xs font-medium text-zinc-600">
                  Order <span className="font-bold">{resumable.orderRef}</span> ·{" "}
                  {formatUGX(resumable.amount)} was never completed.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => { setOfferCod(false); window.location.assign(resumable.paymentUrl); }}
                className="rounded-xl bg-kafunda-green px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-kafunda-green-deep"
              >
                Resume Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  // Close the abandoned order so it doesn't sit as "Pending payment".
                  void cancelPesapalOrder(resumable.trackingId).catch(() => undefined);
                  clearPendingPayment();
                  setResumable(null);
                }}
                className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-700"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

            {/* ── Left: Form sections ── */}
            <div className="lg:col-span-7 space-y-5">

              {/* Section 1: Contact */}
              <SectionCard number={1} title="Contact Information" icon={User}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <InputField label="Full Name" name="fullName" placeholder="e.g. Leo Ajule" required
                      autoComplete="name"
                      value={form.fullName} onChange={handleChange} error={errors.fullName} />
                  </div>
                  <InputField label="Phone Number" name="phone" type="tel" placeholder="0712 345 678"
                    required autoComplete="tel" inputMode="tel"
                    value={form.phone} onChange={handleChange} error={errors.phone} />
                  <InputField label="Email" name="email" type="email" placeholder="For your receipt"
                    optional autoComplete="email" inputMode="email"
                    value={form.email} onChange={handleChange} error={errors.email} />
                </div>
              </SectionCard>

              {/* Section 2: Delivery */}
              <SectionCard number={2} title="Delivery Details" icon={MapPin}>
                <div className="space-y-5">
                  {/* Pin location FIRST → instant delivery fee + auto-filled address */}
                  <div id="delivery-pin" className="scroll-mt-32">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                      Where should we deliver? <span className="text-red-600">*</span> <span className="text-gray-400 font-normal normal-case tracking-normal text-[10px]">(tap Locate me — we fill in the rest)</span>
                    </label>
                    <LocationPicker onChange={handlePinChange} />

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
                            <>Location set — <span className="font-black uppercase">free delivery</span>.</>
                          ) : (
                            <>Location set — delivery: <span className="font-black">{formatUGX(quote.feeUgx)}</span>.</>
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

                  <InputField label="Delivery Address" name="address"
                    placeholder="Filled in from your pin — add building / gate if you like" required
                    autoComplete="street-address"
                    value={form.address} onChange={handleChange} error={errors.address} />

                  {/* Notes are rarely needed — keep them out of the way. */}
                  {showNotes || form.notes ? (
                    <div>
                      <label htmlFor="notes" className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                        Note for the rider <span className="text-gray-400 font-normal normal-case tracking-normal text-[10px]">(optional)</span>
                      </label>
                      <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={2}
                        placeholder="Gate, landmark, or anything the rider should know"
                        className="w-full px-4 py-3 text-base sm:text-sm bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-kafunda-green/20 focus:border-kafunda-green transition-all resize-none" />
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowNotes(true)}
                      className="text-xs font-bold text-kafunda-green hover:underline">
                      + Add a note for the rider
                    </button>
                  )}
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
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden sticky top-32">

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
                    <span>Delivery</span>
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
                  <div role="alert" className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold leading-relaxed">
                    {serverError}
                  </div>
                )}

                {/* A failed online payment should cost us the payment, not the
                    order — same cart, same details, settled on the doorstep. */}
                {offerCod && !isSuccess && (
                  <div className="mx-6 mt-3 rounded-xl border-2 border-zinc-900/10 bg-zinc-50 p-4">
                    <p className="text-xs font-black uppercase tracking-tight text-zinc-900">
                      Still want your order?
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Keep everything as it is and pay cash when the rider arrives — no card, no
                      mobile money needed.
                    </p>
                    <button
                      type="button"
                      onClick={placeCodInstead}
                      disabled={isSubmitting || quoteState !== "ok"}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Placing Order...</>
                      ) : (
                        <><Package className="h-4 w-4" /> Pay Cash on Delivery Instead</>
                      )}
                    </button>
                  </div>
                )}

                {/* Submit */}
                <div className="px-6 pb-6 pt-4">
                  {/* Not disabled for a missing pin: tapping must always DO
                      something — handleSubmit explains what's missing. */}
                  <button type="submit" disabled={isSubmitting || !idempotencyKey}
                    className={`w-full py-4 font-bold text-sm tracking-widest uppercase rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed
                      ${form.paymentMethod === "cod"
                        ? "bg-zinc-900 hover:bg-black text-white"
                        : "bg-kafunda-green hover:bg-kafunda-green-deep text-white"
                    }`}>
                    {isSubmitting ? (
                      <><Loader2 className="h-5 w-5 animate-spin" />
                        {form.paymentMethod === "pesapal" ? "Opening secure payment..." : "Placing Order..."}
                      </>
                    ) : form.paymentMethod === "pesapal" ? (
                      <>{formatUGX(total)} · Pay via Pesapal</>
                    ) : (
                      `Place Order${quoteState === "ok" ? ` · ${formatUGX(subtotal + deliveryFee)} on arrival` : ""}`
                    )}
                  </button>

                  {form.paymentMethod === "pesapal" && (
                    <p className="mt-2 text-center text-[10px] text-zinc-400 font-medium">
                      Pesapal opens securely on this page — you won&apos;t be redirected away.
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

          {/* Mobile: the Pay button lives in the summary at the very bottom of
              the page — keep a copy pinned to the screen so it's never out of
              reach. Same submit, so validation/guidance is identical. */}
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-60 border-t border-gray-200 bg-white/95 backdrop-blur px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
            {serverError && (
              <p role="alert" className="mb-2 text-xs font-semibold text-red-600 line-clamp-2">{serverError}</p>
            )}
            <button type="submit" disabled={isSubmitting || !idempotencyKey}
              className={`w-full flex items-center justify-between gap-3 px-5 py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-md text-white disabled:opacity-70
                ${form.paymentMethod === "cod" ? "bg-zinc-900 hover:bg-black" : "bg-kafunda-green hover:bg-kafunda-green-deep"}`}>
              <span>{formatUGX(form.paymentMethod === "cod" ? subtotal + deliveryFee : total)}</span>
              <span className="flex items-center gap-2">
                {isSubmitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> {form.paymentMethod === "pesapal" ? "Opening…" : "Placing…"}</>
                ) : form.paymentMethod === "pesapal" ? "Pay Now" : "Place Order"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}