import { Truck, Wallet, Store, BadgePercent } from "lucide-react";
import { DELIVERY, FREE_DELIVERY, STORES } from "@/lib/constants";

/** The four doubts that stop a first-time buyer, answered in one row. */
const ITEMS = [
  { icon: Truck, title: `${DELIVERY.estimatedTime} delivery`, body: "Anywhere in Kampala" },
  { icon: Wallet, title: "Pay on delivery", body: "Cash, Mobile Money or card" },
  { icon: Store, title: `${STORES.length} Kampala stores`, body: "Makindye · Mpererwe · Kawempe" },
  { icon: BadgePercent, title: FREE_DELIVERY.shortLabel, body: "Fee shown before you pay" },
];

export default function TrustStrip() {
  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
      <ul className="grid grid-cols-2 gap-2 rounded-2xl border border-kafunda-bone-soft bg-white p-3 sm:gap-4 sm:p-5 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kafunda-green-tint">
              <Icon className="h-5 w-5 text-kafunda-green" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide text-kafunda-ink sm:text-sm">{title}</span>
              <span className="block truncate text-[11px] text-zinc-500 sm:text-xs">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
