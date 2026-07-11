"use client";

/**
 * PaymentConfirmer — polls /api/checkout/pesapal/confirm after the customer
 * lands back from Pesapal.
 * ─────────────────────────────────────────────────────────────────────────
 * Drop into the existing success page WITHOUT replacing your current UI:
 *
 *   // src/app/checkout/success/page.tsx (inside a <Suspense> boundary,
 *   // required because this uses useSearchParams)
 *   import { Suspense } from "react";
 *   import PaymentConfirmer from "@/components/checkout/PaymentConfirmer";
 *
 *   <Suspense fallback={null}>
 *     <PaymentConfirmer onConfirmed={() => clearCart()} />
 *   </Suspense>
 *
 * Pesapal redirects to:
 *   /checkout/success?order=KAF-123&OrderTrackingId=<guid>&OrderMerchantReference=KAF-123
 * so the tracking id is read straight from the URL.
 *
 * Polling: every 4s, max 22 attempts (~88s). Covers slow MoMo PIN entry.
 * States:
 *   confirming → spinner, "Confirming your payment…"
 *   confirmed  → success, fire onConfirmed (clear cart here)
 *   pending    → timed out still pending: honest message, order ref shown
 *   failed     → payment failed message
 *   refunded   → treated as failed for display purposes
 *
 * FIX: the "no tracking id" case is derived in the useState initializer
 * rather than set synchronously inside the effect (react-hooks/
 * set-state-in-effect). If there is no tracking id, the component renders
 * nothing and the effect never starts polling.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type UiState = "confirming" | "confirmed" | "pending" | "failed" | "idle";

const POLL_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 22; // ~88 seconds

interface PaymentConfirmerProps {
  /** Called exactly once when payment is confirmed — clear the cart here. */
  onConfirmed?: () => void;
}

export default function PaymentConfirmer({ onConfirmed }: PaymentConfirmerProps) {
  const searchParams = useSearchParams();
  const trackingId = searchParams.get("OrderTrackingId") || "";
  const merchantRef =
    searchParams.get("OrderMerchantReference") || searchParams.get("order") || "";

  // Derived at first render: no tracking id (direct visit, old bookmark)
  // means there is nothing to confirm — "idle" renders nothing and the
  // effect below never polls. No setState needed in the effect body.
  const [uiState, setUiState] = useState<UiState>(() =>
    trackingId ? "confirming" : "idle"
  );

  const attemptsRef = useRef(0);
  const stoppedRef = useRef(false);
  const confirmedFiredRef = useRef(false);

  const fireConfirmed = useCallback(() => {
    if (confirmedFiredRef.current) return;
    confirmedFiredRef.current = true;
    onConfirmed?.();
  }, [onConfirmed]);

  useEffect(() => {
    if (!trackingId) return; // nothing to confirm, nothing to poll

    stoppedRef.current = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (stoppedRef.current) return;
      attemptsRef.current += 1;

      try {
        const res = await fetch("/api/checkout/pesapal/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderTrackingId: trackingId }),
        });
        const data = (await res.json()) as { state?: string };

        if (stoppedRef.current) return;

        if (data.state === "confirmed") {
          stoppedRef.current = true;
          setUiState("confirmed");
          fireConfirmed();
          return;
        }
        if (data.state === "failed" || data.state === "refunded") {
          stoppedRef.current = true;
          setUiState("failed");
          return;
        }
        // "pending" or transient "error" → keep polling until attempts run out.
      } catch {
        // Network blip on the customer's side — keep polling.
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        stoppedRef.current = true;
        setUiState("pending");
        return;
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      stoppedRef.current = true;
      clearTimeout(timer);
    };
  }, [trackingId, fireConfirmed]);

  // ── UI ──────────────────────────────────────────────────────────────────
  // Deliberately minimal + unstyled-ish so it inherits your success page
  // design. Swap the classNames for your Tailwind tokens.

  if (uiState === "idle") return null;

  if (uiState === "confirming") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="text-sm font-medium">
          Confirming your payment… this usually takes a few seconds.
        </p>
      </div>
    );
  }

  if (uiState === "confirmed") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-900">
        <p className="text-sm font-semibold">Payment confirmed ✓</p>
        <p className="text-sm">
          Your order {merchantRef && <strong>{merchantRef}</strong>} is now being
          prepared. A receipt has been sent to your email.
        </p>
      </div>
    );
  }

  if (uiState === "failed") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900">
        <p className="text-sm font-semibold">Payment was not completed</p>
        <p className="text-sm">
          The payment for {merchantRef ? <strong>{merchantRef}</strong> : "your order"} did
          not go through. You have not been charged for a completed order — please
          try again, or contact us on WhatsApp and quote the order number.
        </p>
      </div>
    );
  }

  // pending (timed out) — be honest, don't fake success or failure.
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <p className="text-sm font-semibold">Payment still being confirmed</p>
      <p className="text-sm">
        Your payment {merchantRef && <>for <strong>{merchantRef}</strong></>} is taking a
        little longer than usual. If you completed the mobile money PIN prompt, your
        order will be confirmed automatically and the receipt emailed to you shortly —
        no need to pay again. If you cancelled, you can simply place the order afresh.
      </p>
    </div>
  );
}