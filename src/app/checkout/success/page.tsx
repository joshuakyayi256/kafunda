"use client";

/**
 * /checkout/success — Pesapal return page with REAL payment verification.
 * ----------------------------------------------------------------------
 * Pesapal redirects here with our `order` param plus its own appended
 * `OrderTrackingId` / `OrderMerchantReference` / `OrderNotificationType`.
 * We poll /api/orders/status (which checks Pesapal directly) instead of
 * the old 1.2s optimistic timer.
 *
 * States:
 *  - loading     → polling Pesapal (up to ~90s)
 *  - success     → Pesapal says COMPLETED (cart cleared here, and only here)
 *  - failed      → CANCELLED notification, or Pesapal says FAILED / INVALID / REVERSED
 *  - confirming  → polling timed out or no tracking id; payment may still be
 *                  processing — IPN remains the source of truth, and the team
 *                  confirms on the call. Cart is NOT cleared.
 *
 * COD never lands here — it has its own inline success screen in /checkout.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle, XCircle, Loader2, ArrowLeft,
  MessageCircle, Package, Phone, Clock,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

type Status = "loading" | "success" | "failed" | "confirming";

const POLL_INTERVAL_MS = 4_000;
const MAX_POLLS = 22; // ≈ 90 seconds

function NextStepsCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">What Happens Next</h2>
      <div className="space-y-4">
        {[
          { icon: Phone, title: "We'll call to confirm", body: "Our team will call you within 30 minutes to confirm your order details." },
          { icon: Package, title: "Order prepared", body: "Your items are picked, packed, and handed to our delivery team." },
          { icon: CheckCircle, title: "Delivered in 1–2 hours", body: "Your order arrives at your door within 1–2 hours of confirmation." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-zinc-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900">{title}</p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Terminal states are knowable from the URL alone — derive them at render
 * (lazy useState initializer) instead of setting state in an effect.
 *  - no order ref            → failed
 *  - CANCELLED notification  → failed (user closed the Pesapal page)
 *  - no tracking id          → confirming (can't verify from here; IPN +
 *                              the confirmation call are the source of truth)
 *  - otherwise               → loading, and the polling effect takes over
 */
function initialStatus(orderRef: string, trackingId: string, notificationType: string): Status {
  if (!orderRef) return "failed";
  if (notificationType.toUpperCase() === "CANCELLED") return "failed";
  if (!trackingId) return "confirming";
  return "loading";
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();

  const orderRef         = searchParams.get("order") || "";
  const trackingId       = searchParams.get("OrderTrackingId") || "";
  const notificationType = searchParams.get("OrderNotificationType") || "";

  const [status, setStatus] = useState<Status>(() =>
    initialStatus(orderRef, trackingId, notificationType)
  );
  const [attempt, setAttempt] = useState(0);

  // Keep clearCart out of the polling effect's deps — it's recreated each
  // render and must not restart the loop. Synced via its own effect (refs
  // must not be written during render — react-hooks/refs).
  const clearCartRef = useRef(clearCart);
  useEffect(() => {
    clearCartRef.current = clearCart;
  }, [clearCart]);

  // Polling — the effect body only schedules a timer (external system);
  // every setState happens inside timer/promise callbacks, never
  // synchronously in the effect (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (initialStatus(orderRef, trackingId, notificationType) !== "loading") return;

    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (cancelled) return;

      try {
        const res = await fetch(
          `/api/orders/status?orderTrackingId=${encodeURIComponent(trackingId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (cancelled) return;

        if (data.status === "completed") {
          clearCartRef.current();
          setStatus("success");
          return;
        }
        if (data.status === "failed" || data.status === "invalid" || data.status === "reversed") {
          setStatus("failed");
          return;
        }
      } catch {
        // Network hiccup — treat as pending and keep polling.
      }

      if (cancelled) return;
      polls += 1;
      setAttempt(polls);

      if (polls >= MAX_POLLS) {
        setStatus("confirming");
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    timer = setTimeout(poll, 300); // first check just after the redirect settles
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderRef, trackingId, notificationType]);

  // ── Loading / verifying ─────────────────────────────────────────────────────
  if (status === "loading") return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 px-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-gray-100" />
        <Loader2 className="h-16 w-16 animate-spin text-kafunda-green absolute inset-0" />
      </div>
      <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-2">
        Confirming your payment…
      </p>
      <p className="text-xs text-zinc-400 max-w-xs text-center">
        {attempt > 5
          ? "Mobile money can take a moment to clear — hang tight, we're checking with Pesapal."
          : "Please wait while we verify your transaction with Pesapal."}
      </p>
    </div>
  );

  // ── Failed ──────────────────────────────────────────────────────────────────
  if (status === "failed") return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-kafunda-crimson" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter mb-3">
            Payment Not Completed
          </h1>
          <p className="text-zinc-500 mb-2 font-medium">
            Your payment was cancelled or could not be processed.
          </p>
          <p className="text-zinc-400 text-sm mb-8">
            Your cart has been saved — you can try again or choose a different payment method.
          </p>

          <div className="space-y-3">
            <button onClick={() => router.push("/checkout")}
              className="w-full bg-kafunda-green hover:bg-kafunda-green-deep text-white py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors">
              Try Again
            </button>
            <a href="https://wa.me/256785498279?text=Hi! I had trouble completing my payment on the Kafunda website."
              target="_blank" rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 border-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700 py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors">
              <MessageCircle className="h-4 w-4" /> Get Help on WhatsApp
            </a>
            <Link href="/shop"
              className="inline-flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-700 font-bold text-xs uppercase tracking-widest transition-colors w-full py-2">
              <ArrowLeft className="h-4 w-4" /> Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Confirming (timed out / unverifiable here) ──────────────────────────────
  if (status === "confirming") return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-md w-full space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">
            Order Received
          </h1>
          {orderRef && (
            <div className="inline-block bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-4">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Order Reference</p>
              <p className="text-lg font-black text-zinc-900">{orderRef}</p>
            </div>
          )}
          <p className="text-zinc-500 text-sm font-medium mb-6 leading-relaxed">
            Your payment is still being confirmed — mobile money can take a few minutes.
            If you were charged, you&apos;re all set: payment is verified automatically and
            our team will confirm everything on your call.
          </p>

          <a href={`https://wa.me/256785498279?text=Hi! I just paid for order ${orderRef} on the Kafunda website but the page is still confirming. Please check for me.`}
            target="_blank" rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors mb-3">
            <MessageCircle className="h-4 w-4" /> Confirm on WhatsApp
          </a>

          <Link href="/shop"
            className="inline-flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-700 font-bold text-xs uppercase tracking-widest transition-colors w-full py-2">
            <ArrowLeft className="h-4 w-4" /> Continue Shopping
          </Link>
        </div>

        <NextStepsCard />
      </div>
    </div>
  );

  // ── Success (verified with Pesapal) ─────────────────────────────────────────
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-md w-full space-y-4">

        {/* Main confirmation card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-success-green" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">
            Payment Confirmed!
          </h1>
          {orderRef && (
            <div className="inline-block bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-4">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Order Reference</p>
              <p className="text-lg font-black text-zinc-900">{orderRef}</p>
            </div>
          )}
          <p className="text-zinc-500 text-sm font-medium mb-6 leading-relaxed">
            Thank you for shopping with Kafunda Wines &amp; Spirits. Your order is confirmed and is being prepared for delivery.
          </p>

          <a href={`https://wa.me/256785498279?text=Hi! I just completed payment for order ${orderRef} on the Kafunda website. Please confirm delivery.`}
            target="_blank" rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors mb-3">
            <MessageCircle className="h-4 w-4" /> Confirm on WhatsApp
          </a>

          <Link href="/shop"
            className="inline-flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-700 font-bold text-xs uppercase tracking-widest transition-colors w-full py-2">
            <ArrowLeft className="h-4 w-4" /> Continue Shopping
          </Link>
        </div>

        <NextStepsCard />

      </div>
    </div>
  );
}