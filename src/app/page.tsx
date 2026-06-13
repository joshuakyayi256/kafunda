// Render on-demand (not at build time) and cache the result for 5 minutes.
// `force-dynamic` ensures `next build` NEVER reaches out to WooCommerce, so a
// transient Woo 403/SSL/network blip (or a greylisted build IP) can't fail the
// deploy. The first real request fills the cache; ISR keeps it fast after that.
export const dynamic = "force-dynamic";
export const revalidate = 300;

import Hero from "@/components/shared/Hero";
import BrandMarquee from "@/components/shared/BrandMarquee";
import CategoryGrid from "@/components/shared/CategoryGrid";
import CategoryShelf from "@/components/shared/CategoryShelf";
import PromoBanner from "@/components/shared/PromoBanner";
import RecentlyViewed from "@/components/shared/RecentlyViewed";
import { getAllProducts, getCategories } from "@/lib/api";
import { Product } from "@/types";

/** Case-insensitive: does the product's category string contain any keyword? */
function inCategory(p: Product, keywords: string[]): boolean {
  const cat = p.category?.toLowerCase() || "";
  return keywords.some((kw) => cat.includes(kw));
}

export default async function Home() {
  const [liveProducts, wpCategories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);

  const products = liveProducts || [];

  // ── Serve-stale-on-error guard ─────────────────────────────────────────────
  // At RUNTIME: if WooCommerce is unreachable during a background revalidation,
  // the fetch layer returns an empty list. Rendering that would cache an EMPTY
  // homepage, so we throw — Next.js then keeps serving the last good version
  // and retries later, making Woo downtime invisible to shoppers.
  //
  // ── Empty-catalogue handling ───────────────────────────────────────────────
  // The catalogue can come back empty if WooCommerce is briefly unreachable
  // (SSL/WAF/host hiccup). We do NOT hard-throw a 500 here: a storefront that
  // shows a server-error screen on a backend blip is worse than one that loads
  // its shell and tells the shopper products are on the way. The page renders
  // normally; CategoryShelf already handles empty arrays, and we surface a
  // single friendly notice. ISR (revalidate=300) retries automatically, so the
  // catalogue fills itself the moment Woo is reachable again — no redeploy.
  const catalogueEmpty = products.length === 0;

  // Filter out the "Offers" pseudo-category from the tile grid
  const displayCategories = (wpCategories || []).filter(
    (cat) => !["offers", "offer"].includes(cat.name.toLowerCase())
  );

  // ── Section datasets (one fetch, filtered in memory) ──────────────────────
  const offerPicks = products.filter((p) => p.is_sale);

  const beers       = products.filter((p) => inCategory(p, ["beer", "cider"]));
  const champagnes  = products.filter((p) => inCategory(p, ["champagne", "sparkling", "prosecco"]));
  const softDrinks  = products.filter((p) =>
    inCategory(p, ["soft drink", "juice", "water", "soda", "mixer", "energy", "non-alcoholic", "accessor", "disposable"])
  );
  const wines       = products.filter((p) => inCategory(p, ["wine"]) && !inCategory(p, ["sparkling", "champagne"]));
  const whiskies    = products.filter((p) => inCategory(p, ["whisk", "bourbon", "scotch"]));
  const ginsVodkas  = products.filter((p) => inCategory(p, ["gin", "vodka"]));
  const darkSpirits = products.filter((p) => inCategory(p, ["cognac", "brandy", "rum", "tequila"]));
  const creams      = products.filter((p) => inCategory(p, ["cream", "liqueur", "bitter"]));

  return (
    <main className="min-h-screen bg-kafunda-bone">
      {/* 1 ── Hero: image-led, minimal copy */}
      <Hero />

      <BrandMarquee />

      {catalogueEmpty && (
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <div className="rounded-2xl border border-kafunda-cream-soft bg-white/60 px-6 py-8">
            <p className="text-sm font-black uppercase tracking-widest text-kafunda-burgundy mb-1">
              Our shelves are being restocked
            </p>
            <p className="text-xs text-kafunda-burgundy/60 leading-relaxed max-w-md mx-auto">
              We&apos;re loading the latest products and prices. Please check back
              in a moment — or reach us on WhatsApp and we&apos;ll take your order
              right away.
            </p>
            <a
              href="https://wa.me/256785498279"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors"
            >
              Order on WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* 2 ── Today's Offers */}
      <CategoryShelf
        title="Today's Offers"
        accentWord="Offers"
        eyebrow="Limited Time"
        products={offerPicks}
        viewAllHref="/shop?filter=offers"
        textured
      />

      {/* 3 ── Categories grid (replaces the marquee) */}
      <CategoryGrid categories={displayCategories} />

      {/* 4 ── Beers */}
      <CategoryShelf
        title="Beers & Ciders"
        accentWord="Beers"
        products={beers}
        viewAllHref="/shop?category=Beers"
      />

      {/* 5 ── Champagnes */}
      <CategoryShelf
        title="Champagnes & Sparkling"
        accentWord="Champagnes"
        products={champagnes}
        viewAllHref="/shop?category=Champagne"
      />

      {/* 6 ── Soft drinks & accessories */}
      <CategoryShelf
        title="Soft Drinks & Accessories"
        accentWord="Soft Drinks"
        products={softDrinks}
        viewAllHref="/shop?category=Soft-Drinks"
        textured
      />

      {/* Promo banner between shelves */}
      <PromoBanner
        eyebrow="Limited Time"
        line1="Up to"
        accent="30% off"
        line2="special offers"
        ctaLabel="Shop all deals"
        href="/shop?filter=offers"
      />

      {/* 7 ── The other drink types */}
      <CategoryShelf
        title="Fine Wines"
        accentWord="Wines"
        products={wines}
        viewAllHref="/shop?category=Wines"
      />
      <CategoryShelf
        title="Whiskies & Bourbons"
        accentWord="Whiskies"
        products={whiskies}
        viewAllHref="/shop?category=Whisky"
      />
      <CategoryShelf
        title="Gins & Vodkas"
        accentWord="Gins"
        products={ginsVodkas}
        viewAllHref="/shop?category=Gins"
      />
      <CategoryShelf
        title="Cognacs, Rums & Tequilas"
        accentWord="Cognacs"
        products={darkSpirits}
        viewAllHref="/shop?category=Cognacs"
        textured
      />
      <CategoryShelf
        title="Creams & Liqueurs"
        accentWord="Creams"
        products={creams}
        viewAllHref="/shop?category=Creams"
      />

      <RecentlyViewed />
    </main>
  );
}