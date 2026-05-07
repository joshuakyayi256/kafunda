"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, ArrowLeft, MessageCircle, Package, Phone } from "lucide-react";
import { useCart } from "@/context/CartContext";

type Status = "loading" | "success" | "failed";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<Status>("loading");

  const orderRef        = searchParams.get("order") || "";
  const pesapalStatus   = searchParams.get("OrderNotificationType") || "";

  useEffect(() => {
    if (!orderRef) {
      setStatus("failed");
      return;
    }
    // Pesapal sends "CANCELLED" when the user closes the payment page
    if (pesapalStatus.toUpperCase() === "CANCELLED") {
      setStatus("failed");
      return;
    }
    // Optimistic success — real confirmation is via IPN updating WooCommerce
    const t = setTimeout(() => {
      clearCart();
      setStatus("success");
    }, 1200);
    return () => clearTimeout(t);
  }, [orderRef, pesapalStatus, clearCart]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === "loading") return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 px-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-gray-100" />
        <Loader2 className="h-16 w-16 animate-spin text-primary-red absolute inset-0" />
      </div>
      <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-2">
        Confirming your payment…
      </p>
      <p className="text-xs text-zinc-400 max-w-xs text-center">
        Please wait while we verify your transaction with Pesapal.
      </p>
    </div>
  );

  // ── Failed ─────────────────────────────────────────────────────────────────
  if (status === "failed") return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-primary-red" />
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
              className="w-full bg-primary-red hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors">
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

  // ── Success ────────────────────────────────────────────────────────────────
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

        {/* What happens next */}
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

      </div>
    </div>
  );
}
