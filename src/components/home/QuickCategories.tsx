import Link from "next/link";

/**
 * One-tap category tiles right under the hero. Ad visitors usually arrive
 * knowing roughly what they want ("whisky", "beer for tonight") — this gets
 * them there without hunting through the menu.
 */
const TILES = [
  { label: "Whisky", icon: "🥃", href: "/shop?category=Whiskys" },
  { label: "Wine", icon: "🍷", href: "/shop?category=Wines" },
  { label: "Beer", icon: "🍺", href: "/shop?category=Beers" },
  { label: "Gin", icon: "🌿", href: "/shop?category=Gins" },
  { label: "Vodka", icon: "❄️", href: "/shop?category=Vodkas" },
  { label: "Champagne", icon: "🍾", href: "/shop?category=Champagnes" },
  { label: "Cognac", icon: "🥂", href: "/shop?category=Cognacs" },
  { label: "Under 50k", icon: "💸", href: "/shop?maxPrice=50000" },
];

export default function QuickCategories() {
  return (
    <nav aria-label="Shop by category" className="mx-auto max-w-7xl px-3 pt-4 sm:px-6 md:pt-6 lg:px-8">
      <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-8 sm:gap-3" style={{ scrollbarWidth: "none" }}>
        {TILES.map((t) => (
          <li key={t.label} className="shrink-0">
            <Link
              href={t.href}
              className="flex w-20 flex-col items-center gap-1 rounded-2xl border border-kafunda-bone-soft bg-white px-2 py-3 text-center transition-all hover:-translate-y-0.5 hover:border-kafunda-green/40 hover:shadow-md sm:w-auto"
            >
              <span className="text-2xl leading-none" aria-hidden>{t.icon}</span>
              <span className="text-[11px] font-black uppercase tracking-wide text-kafunda-ink">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
