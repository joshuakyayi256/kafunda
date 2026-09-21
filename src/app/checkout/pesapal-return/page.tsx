"use client";

/**
 * /checkout/pesapal-return — the callback target for the EMBEDDED Pesapal flow.
 * ---------------------------------------------------------------------------
 * When payment happens inside the modal (PesapalModal), Pesapal is told to send
 * the customer here rather than to /checkout/success. This page renders inside
 * the iframe, so its only job is to hand the return params to the parent
 * window, which owns the confirmation UI.
 *
 * If it is ever opened outside an iframe (a bookmarked callback, a customer
 * who opened the payment page in a new tab), it forwards to /checkout/success
 * with the params intact so the standalone verification flow still works.
 *
 * `window.location.search` is read directly instead of useSearchParams: Pesapal
 * appends params we don't declare, and this avoids needing a Suspense boundary
 * for a page that renders one spinner.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PesapalReturnPage() {
  const router = useRouter();

  useEffect(() => {
    const search = window.location.search;

    if (window.top !== window.self) {
      window.parent.postMessage(
        { type: "kafunda:pesapal-return", search },
        window.location.origin
      );
      return;
    }

    router.replace(`/checkout/success${search}`);
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-kafunda-green" />
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
        Finishing up…
      </p>
    </div>
  );
}
