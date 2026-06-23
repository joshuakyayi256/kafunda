import Link from "next/link";
import { WPCategory } from "@/lib/api";

/**
 * Categories as clean TEXT tiles (images removed per client — they crowded the
 * homepage). Each tile is a compact pill/card with the category name only.
 * 2-up mobile -> up to 6-up desktop.
 */
export default function CategoryGrid({ categories }: { categories: WPCategory[] }) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-10 md:py-12 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-kafunda-ink">
            Shop by <span className="text-primary-red">Category</span>
          </h2>
          <Link
            href="/shop"
            className="text-primary-red font-bold uppercase tracking-widest text-[10px] md:text-xs hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${encodeURIComponent(cat.name)}`}
              className="group flex items-center justify-center text-center rounded-2xl border border-kafunda-bone-soft bg-white px-4 py-5 hover:border-primary-red/40 hover:shadow-md transition-all"
            >
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-kafunda-ink group-hover:text-primary-red transition-colors leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}