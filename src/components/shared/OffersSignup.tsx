"use client";

/**
 * Offers sign-up popup — turns ad clicks that don't buy today into people
 * you can email (and push) tomorrow. Paid traffic is expensive; most first
 * visits don't convert, so capturing the contact is the cheapest re-sale.
 *
 * Shows once: after 30s browsing, or on exit intent (desktop), never on
 * cart/checkout, never before the age gate is passed, and not again for
 * 7 days after "No thanks" (forever after signing up).
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Gift, Loader2, CheckCircle } from "lucide-react";
import { maybePromptPush } from "@/lib/track";

const KEY = "kafunda:offers-popup";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const DELAY_MS = 30_000;

function shouldShow(): boolean {
  try {
    if (localStorage.getItem("kafunda_age_verified") !== "true") return false;
    const v = localStorage.getItem(KEY);
    if (v === "subscribed") return false;
    if (v && Date.now() - Number(v) < SNOOZE_MS) return false;
    return true;
  } catch {
    return false;
  }
}

export default function OffersSignup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const blocked = /^\/(cart|checkout|marketing)/.test(pathname ?? "");

  useEffect(() => {
    if (blocked) return;
    let fired = false;
    const show = () => {
      if (fired || !shouldShow()) return;
      fired = true;
      setOpen(true);
    };
    const timer = setTimeout(show, DELAY_MS);
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) show();
    };
    document.addEventListener("mouseout", onLeave);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [blocked]);

  const close = () => {
    setOpen(false);
    try {
      if (localStorage.getItem(KEY) !== "subscribed") localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setState("sending");
    try {
      // Neutral path: ad blockers commonly block URLs containing "subscribe".
      let res: Response;
      try {
        res = await fetch("/api/offers-join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: "popup" }),
        });
      } catch {
        throw new Error("Couldn't connect. Check your internet, or pause your ad blocker for this site, and try again.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Sign-up failed (error ${res.status}). Please try again.`);
      try { localStorage.setItem(KEY, "subscribed"); } catch { /* ignore */ }
      setState("done");
      maybePromptPush(1200, true);
      setTimeout(() => setOpen(false), 3500);
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (!open || blocked) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="offers-title"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={close} aria-label="Close" className="absolute right-3 top-3 rounded-full p-2 text-zinc-400 hover:bg-gray-100 hover:text-zinc-700">
          <X className="h-5 w-5" />
        </button>

        {state === "done" ? (
          <div className="py-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-kafunda-green" />
            <p className="text-lg font-black uppercase tracking-tight text-zinc-900">You&apos;re on the list</p>
            <p className="mt-1 text-sm text-zinc-500">Watch your inbox for this week&apos;s deals.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-kafunda-green-tint">
              <Gift className="h-6 w-6 text-kafunda-green" />
            </div>
            <h2 id="offers-title" className="text-2xl font-black uppercase tracking-tighter text-zinc-900">
              Don&apos;t miss a deal
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Weekly offers, price drops and new arrivals, straight to your inbox. Delivered in 1–2 hours across Kampala.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base sm:text-sm focus:border-kafunda-green focus:outline-none focus:ring-2 focus:ring-kafunda-green/20"
              />
              {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={state === "sending"}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-kafunda-green text-sm font-bold uppercase tracking-widest text-white hover:bg-kafunda-green-deep disabled:opacity-60"
              >
                {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send me the offers"}
              </button>
              <button type="button" onClick={close} className="w-full text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-600">
                No thanks
              </button>
            </form>
            <p className="mt-3 text-[10px] text-zinc-400">18+ only. Unsubscribe any time with one click.</p>
          </>
        )}
      </div>
    </div>
  );
}
