import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import { Product } from "@/types";

/**
 * Reusable product shelf: section heading + 5-column product grid.
 * Used for every category band on the landing page (Beers, Champagnes, ...).
 *
 * Grid: 2-up mobile, 3-up tablet, 5-up desktop (the "5 column" requirement).
 * `limit` defaults to 10 (two desktop rows). Pass limit={25} for the full
 * 5 x 5 block per category if the client insists - it makes a long page.
 */
interface CategoryShelfProps {
  title: string;
  /** Word in the title to render in the accent colour. */
  accentWord?: string;
  eyebrow?: string;
  products: Product[];
  viewAllHref: string;
  limit?: number;
  /** Renders the section on the textured bone band instead of white. */
  textured?: boolean;
}

export default function CategoryShelf({
  title,
  accentWord,
  eyebrow,
  products,
  viewAllHref,
  limit = 10,
  textured = false,
}: CategoryShelfProps) {
  if (!products || products.length === 0) return null;

  const items = products.slice(0, limit);

  // Split the title around the accent word so it can be coloured.
  let before = title;
  let accent = "";
  let after = "";
  if (accentWord && title.includes(accentWord)) {
    const idx = title.indexOf(accentWord);
    before = title.slice(0, idx);
    accent = accentWord;
    after = title.slice(idx + accentWord.length);
  }

  return (
    <section className={`py-10 md:py-12 ${textured ? "bg-kafunda-texture" : "bg-white"} border-t border-kafunda-bone-soft`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-6 md:mb-8">
          <div>
            {eyebrow && (
              <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-1.5">
                {eyebrow}
              </p>
            )}
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-kafunda-ink">
              {before}
              {accent && <span className="text-primary-red">{accent}</span>}
              {after}
            </h2>
          </div>
          <Link
            href={viewAllHref}
            className="text-primary-red font-bold uppercase tracking-widest text-[10px] md:text-xs hover:underline flex items-center shrink-0"
          >
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}