import { MessageCircle, Phone } from "lucide-react";
import { CONTACT } from "@/lib/constants";

/**
 * For visitors who'd rather just tell someone what they want — common in
 * Kampala and a big share of real orders. Placed mid-page and near the end.
 */
export default function WhatsAppBand({ campaign }: { campaign?: string }) {
  const text = encodeURIComponent(
    campaign ? `Hi Kafunda! I'd like to order from the ${campaign} deals.` : "Hi Kafunda! I'd like to place an order."
  );
  return (
    <section className="mx-auto max-w-7xl px-3 py-6 sm:px-6 md:py-10 lg:px-8">
      <div className="flex flex-col items-start gap-4 rounded-2xl bg-emerald-600 px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="text-lg font-black uppercase tracking-tight sm:text-2xl">Know what you want?</p>
          <p className="text-sm text-white/85">Send us your list on WhatsApp — we confirm the price and deliver in 1–2 hours.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <a
            href={`${CONTACT.whatsapp}?text=${text}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-50 sm:flex-none"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp us
          </a>
          <a
            href={`tel:${CONTACT.phoneDial}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-5 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-white/10"
          >
            <Phone className="h-4 w-4" /> Call
          </a>
        </div>
      </div>
    </section>
  );
}
