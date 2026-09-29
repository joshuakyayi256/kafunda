"use client";

/**
 * PesapalModal — in-page Pesapal checkout.
 * ---------------------------------------------------------------------------
 * The old flow sent the customer away with `window.location.href = redirect_url`,
 * which loses the checkout page (and everything typed into it). Pesapal's hosted
 * payment page supports being embedded, so we mount it in an iframe over the
 * checkout instead — the customer never leaves the site.
 *
 * Completion is detected two ways, and both are needed:
 *
 *  1. Pesapal navigates the iframe to our `callback_url`
 *     (/checkout/pesapal-return), which postMessages the return params up to
 *     this window. That is the *signal*, not the proof — it tells us the
 *     customer is done with the payment page, and whether they cancelled.
 *  2. /api/orders/status (server → Pesapal GetTransactionStatus) is the
 *     *proof*. Nothing is treated as paid until Pesapal says COMPLETED.
 *
 * Why the poll runs in two modes: before the return signal, a transaction that
 * hasn't been attempted yet reads back as INVALID from Pesapal. Treating that
 * as a failure would kill the modal the moment it opened, so while the customer
 * is still on the payment page only COMPLETED is terminal. After the return
 * signal, FAILED / INVALID / REVERSED mean what they say.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";

const POLL_INTERVAL_MS = 2_500;
/** ~10 minutes of payment-page time (MoMo PIN prompts can be slow). */
const MAX_POLLS_PAYING = 240;
/** ~90s of verification after the customer returns from the payment page. */
const MAX_POLLS_VERIFYING = 36;

const RETRY_HINT = "Your cart is saved — try again, or pay cash on delivery.";

interface StatusResponse {
  status?: string;
  reason?: string | null;
}

/**
 * Cancel an unfinished payment's Woo order (verified server-side against
 * Pesapal — a paid order comes back "confirmed" instead). Exported so the
 * checkout page can also close a parked payment the customer abandons.
 */
export async function cancelPesapalOrder(trackingId: string): Promise<string | undefined> {
  const res = await fetch("/api/checkout/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderTrackingId: trackingId, cancel: true }),
    keepalive: true, // survives the page being closed right after
  });
  const data = (await res.json()) as { state?: string };
  return data.state;
}

async function fetchStatus(trackingId: string): Promise<StatusResponse> {
  const res = await fetch(
    `/api/orders/status?orderTrackingId=${encodeURIComponent(trackingId)}`,
    { cache: "no-store" }
  );
  return (await res.json()) as StatusResponse;
}

type Phase = "paying" | "verifying" | "timeout";

interface PesapalModalProps {
  /** Pesapal hosted payment page URL (redirect_url from SubmitOrderRequest). */
  paymentUrl: string;
  /** Our merchant reference, e.g. KAF-1234. */
  orderRef: string;
  /** Pesapal OrderTrackingId — required to verify the payment. */
  trackingId: string;
  /** Formatted amount, shown in the modal header. */
  amountLabel: string;
  /** Pesapal confirmed the payment. */
  onCompleted: () => void;
  /** Payment was cancelled or declined — message is customer-facing. */
  onFailed: (message: string) => void;
  /** Customer dismissed the modal while the payment page was still open. */
  onDismiss: () => void;
}

export default function PesapalModal({
  paymentUrl,
  orderRef,
  trackingId,
  amountLabel,
  onCompleted,
  onFailed,
  onDismiss,
}: PesapalModalProps) {
  const [phase, setPhase] = useState<Phase>("paying");
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Some browsers (iPhone Safari, private modes) block the cookies Pesapal's
  // page needs inside a pop-up, and it can hang on a spinner. After a short
  // wait we offer the SAME payment on Pesapal's full page — it returns to our
  // site and is verified exactly the same way.
  const [showFallback, setShowFallback] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowFallback(true), 10_000);
    return () => clearTimeout(t);
  }, []);

  const openFullPage = useCallback(() => {
    settledRef.current = true; // stop polling; the return page takes over
    window.location.assign(paymentUrl);
  }, [paymentUrl]);

  // Terminal callbacks must fire exactly once, and must not restart the poll
  // loop when the parent re-renders and hands us new function identities.
  const settledRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);
  useEffect(() => { onCompletedRef.current = onCompleted; }, [onCompleted]);
  useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);

  const settleCompleted = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    onCompletedRef.current();
  }, []);

  const settleFailed = useCallback((message: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    onFailedRef.current(message);
  }, []);

  /**
   * Customer taps Cancel. One last status check first: if they already
   * approved the prompt on their phone, cancelling would lose a PAID order —
   * so a completed payment is honoured instead of discarded.
   */
  const handleCancel = useCallback(async () => {
    if (cancelling || settledRef.current) return;
    setCancelling(true);
    try {
      // The server checks with Pesapal: a paid order is confirmed, an unpaid
      // one is closed as "cancelled" so it doesn't linger as Pending payment.
      const state = await cancelPesapalOrder(trackingId);
      if (state === "confirmed") {
        settleCompleted();
        return;
      }
    } catch {
      // Can't reach the status check — cancel anyway; the IPN still backstops.
    }
    if (settledRef.current) return;
    settledRef.current = true;
    onDismiss();
  }, [cancelling, trackingId, settleCompleted, onDismiss]);

  // Escape key cancels too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") void handleCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCancel]);

  // ── Lock the page behind the modal ────────────────────────────────────────
  useScrollLock(true);

  // ── Return signal from the iframe (/checkout/pesapal-return) ──────────────
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; search?: string } | null;
      if (!data || data.type !== "kafunda:pesapal-return") return;

      const params = new URLSearchParams(data.search || "");
      const notification = (params.get("OrderNotificationType") || "").toUpperCase();

      if (notification === "CANCELLED") {
        void cancelPesapalOrder(trackingId).catch(() => undefined);
        settleFailed(`Payment was cancelled. ${RETRY_HINT}`);
        return;
      }
      // Otherwise hand over to verification; the poll below decides.
      setPhase((p) => (p === "paying" ? "verifying" : p));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [settleFailed, trackingId]);

  // ── Verification poll (the authority on whether money moved) ──────────────
  useEffect(() => {
    if (!trackingId) return;
    if (phase === "timeout") return;

    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    const maxPolls = phase === "verifying" ? MAX_POLLS_VERIFYING : MAX_POLLS_PAYING;

    /**
     * Settle the order in WooCommerce. /api/checkout/confirm re-verifies with
     * Pesapal server-side and writes the terminal status — a paid order becomes
     * processing + set_paid, so the shop never has to chase a "pending" order
     * that was actually paid for. The IPN does the same job independently;
     * this runs because the IPN can be late, dropped or misconfigured, and a
     * customer standing at the counter can't wait for it.
     *
     * Best effort by design: the poll below has ALREADY established the truth
     * from Pesapal, so a Woo hiccup here must not change what the customer is
     * told. It just gets retried once and logged.
     */
    async function finalizeInWoo() {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch("/api/checkout/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderTrackingId: trackingId }),
          });
          const data = (await res.json()) as { state?: string };
          if (data.state && data.state !== "error") return;
        } catch {
          // fall through to the retry
        }
      }
      console.warn("[PesapalModal] Woo finalisation did not confirm — IPN will backstop.");
    }

    async function poll() {
      if (cancelled || settledRef.current) return;

      try {
        const data = await fetchStatus(trackingId);

        if (cancelled || settledRef.current) return;

        if (data.status === "completed") {
          // Flip the Woo order to paid BEFORE telling the customer they're
          // done, so the order is already actionable by the time they see the
          // confirmation.
          await finalizeInWoo();
          if (cancelled) return;
          settleCompleted();
          return;
        }
        // FAILED means a real attempt was declined (insufficient funds, wrong
        // PIN, rejected prompt) — tell the customer straight away instead of
        // leaving them watching a spinner. INVALID / REVERSED only count once
        // they're back from the payment page: an unattempted transaction
        // reads as INVALID.
        if (
          data.status === "failed" ||
          (phase === "verifying" && (data.status === "invalid" || data.status === "reversed"))
        ) {
          const reason = data.reason || "Payment was not completed.";
          void finalizeInWoo(); // records the failure against the order; don't make the customer wait
          settleFailed(`${reason} ${RETRY_HINT}`);
          return;
        }
      } catch {
        // Network blip on the customer's side — keep polling.
      }

      if (cancelled || settledRef.current) return;
      polls += 1;

      if (polls >= maxPolls) {
        setPhase("timeout");
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    timer = setTimeout(poll, phase === "verifying" ? 300 : POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trackingId, phase, settleCompleted, settleFailed]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Pesapal payment"
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl">

        {/* Header. Cancel is always available; it re-checks with Pesapal first
            so an already-approved payment is never thrown away. The window
            also closes by itself once the payment is paid or declined. */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-5 py-3.5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Order {orderRef}
            </p>
            <p className="truncate text-sm font-black text-zinc-900">
              Pay {amountLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={cancelling}
            aria-label="Cancel payment"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-xs font-bold text-zinc-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        </div>

        {/* Payment frame */}
        <div className="relative min-h-[420px] flex-1 bg-gray-50 sm:min-h-[520px]">
          <iframe
            src={paymentUrl}
            title="Pesapal secure payment"
            className="absolute inset-0 h-full w-full border-0"
            onLoad={() => setFrameLoaded(true)}
            allow="payment *"
          />

          {!frameLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 px-8 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-kafunda-green" />
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Loading secure payment…
              </p>
              {showFallback && (
                <button
                  type="button"
                  onClick={openFullPage}
                  className="mt-3 rounded-xl bg-kafunda-green px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-md transition-colors hover:bg-kafunda-green-deep"
                >
                  Continue on Pesapal&apos;s secure page
                </button>
              )}
            </div>
          )}

          {/* Loaded but may still be stuck (blocked cookies inside the frame):
              a slim, non-blocking way out once the customer has waited. */}
          {frameLoaded && showFallback && phase === "paying" && (
            <button
              type="button"
              onClick={openFullPage}
              className="absolute inset-x-0 top-0 z-10 bg-amber-50/95 border-b border-amber-200 px-4 py-2 text-center text-[11px] font-bold text-amber-800 hover:bg-amber-100"
            >
              Payment page not loading? Tap here to continue on Pesapal&apos;s full page →
            </button>
          )}

          {/* Verifying / timed out both cover the frame — the payment page has
              done its job by then and leaving it visible underneath confuses. */}
          {phase === "verifying" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-kafunda-green" />
              <p className="text-sm font-black uppercase tracking-tight text-zinc-900">
                Confirming your payment…
              </p>
              <p className="text-xs leading-relaxed text-zinc-400">
                Mobile money can take a few seconds to clear. Please keep this window open.
              </p>
            </div>
          )}

          {phase === "timeout" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-8 text-center">
              <p className="text-sm font-black uppercase tracking-tight text-zinc-900">
                Still confirming
              </p>
              <p className="text-xs leading-relaxed text-zinc-400">
                Your payment for <span className="font-bold text-zinc-600">{orderRef}</span> is
                taking longer than usual. If you completed the prompt, it will be confirmed
                automatically and our team will call you — no need to pay again.
              </p>
              <a
                href={`https://wa.me/256785498279?text=Hi! I paid for order ${orderRef} on the Kafunda website but it is still confirming. Please check for me.`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 rounded-xl bg-emerald-500 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-emerald-600"
              >
                Confirm on WhatsApp
              </a>
              <button
                type="button"
                onClick={() =>
                  settleFailed(
                    `Payment for ${orderRef} is still being confirmed. If you completed the prompt, do NOT pay again — our team will confirm it on your call.`
                  )
                }
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-700"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer. The escape hatch matters: if a browser (or a future Pesapal
            frame policy) refuses the embed, the customer can still pay in a tab
            — this window keeps polling and confirms either way. */}
        <div className="flex shrink-0 flex-col items-center gap-1.5 border-t border-gray-100 bg-white px-5 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            <Lock className="h-3.5 w-3.5 text-success-green" />
            Secured by Pesapal
            <ShieldCheck className="ml-1 h-3.5 w-3.5 text-success-green" />
          </div>
          {phase === "paying" && (
            <>
              <p className="text-center text-[10px] font-semibold leading-relaxed text-zinc-400">
                Approve the prompt on your phone — this window closes on its own when it&apos;s done.
              </p>
              <button
                type="button"
                onClick={openFullPage}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 underline transition-colors hover:text-zinc-800"
              >
                Trouble paying? Open the full payment page
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
