import Image from "next/image";
import Link from "next/link";
import { WPCategory } from "@/lib/api";

/**
 * Categories as a static grid (replaces the auto-scrolling CategoryMarquee).
 * 3-up on mobile, 6-up on desktop. Tiles use the category image from
 * WooCommerce when present, otherwise a green initial tile.
 */
export default function CategoryGrid({ categories }: { categories: WPCategory[] }) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-10 md:py-12 bg-kafunda-texture">
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

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${encodeURIComponent(cat.name)}`}
              className="group flex flex-col items-center gap-2.5"
            >
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white border border-kafunda-bone-soft group-hover:border-primary-red/40 group-hover:shadow-md transition-all">
                {cat.image?.sourceUrl ? (
                  <Image
                    src={cat.image.sourceUrl}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-kafunda-green-tint">
                    <span className="text-3xl font-black text-kafunda-green-deep/70">
                      {cat.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-kafunda-ink group-hover:text-primary-red transition-colors text-center leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}