"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  MessageCircle,
} from "lucide-react";

type Status = "loading" | "success" | "failed" | "pending";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const orderRef = searchParams.get("order") || "";

  useEffect(() => {
    // Pesapal appends OrderTrackingId and OrderMerchantReference to the callback_url
    // We can use the presence of the order reference to determine the likely outcome.
    // A definitive status is confirmed server-side via IPN — this page is purely for UX.
    if (orderRef) {
      // Give IPN a moment, then show optimistic success
      const t = setTimeout(() => setStatus("success"), 1200);
      return () => clearTimeout(t);
    } else {
      setStatus("failed");
    }
  }, [orderRef]);

  if (status === "loading") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary-red" />
        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
          Confirming your payment…
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <XCircle className="h-20 w-20 text-primary-red" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-3">
            Payment Unsuccessful
          </h1>
          <p className="text-zinc-500 mb-8 font-medium">
            Your payment could not be completed. Your cart has been preserved — please try again.
          </p>
          <button
            onClick={() => router.push("/checkout")}
            className="w-full bg-primary-red hover:bg-black text-white py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors mb-3"
          >
            Try Again
          </button>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ──
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-20 w-20 text-success-green" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-3">
          Payment Received!
        </h1>
        {orderRef && (
          <p className="text-zinc-500 mb-2 font-medium">
            Order reference:{" "}
            <span className="font-black text-zinc-900">{orderRef}</span>
          </p>
        )}
        <p className="text-zinc-500 mb-8 font-medium">
          Thank you for shopping with Kafunda Wines &amp; Spirits. Your order is being
          prepared, and our team will be in touch shortly.
        </p>
        <a
          href={`https://wa.me/256785498279?text=Hi! I just completed payment for order ${orderRef} on the Kafunda website.`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-colors mb-4 w-full justify-center"
        >
          <MessageCircle className="h-4 w-4" />
          Confirm on WhatsApp
        </a>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
