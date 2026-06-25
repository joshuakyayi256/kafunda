// Render on-demand (not at build time) and cache the result for 5 minutes.
// `force-dynamic` ensures `next build` NEVER reaches out to WooCommerce, so a
// transient Woo 403/SSL/network blip (or a greylisted build IP) can't fail the
// deploy. The first real request fills the cache; ISR keeps it fast after that.
export const dynamic = "force-dynamic";
export const revalidate = 300;

import Hero from "@/components/shared/Hero";
import BrandMarquee from "@/components/shared/BrandMarquee";
import CategoryShelf from "@/components/shared/CategoryShelf";
import PromoBanner from "@/components/shared/PromoBanner";
import RecentlyViewed from "@/components/shared/RecentlyViewed";
import { getAllProducts } from "@/lib/api";
import RecommendedForYou from "@/components/shared/RecommendedForYou";
import { Product } from "@/types";

/** Case-insensitive: does the product's category string contain any keyword? */
function inCategory(p: Product, keywords: string[]): boolean {
  const cat = p.category?.toLowerCase() || "";
  return keywords.some((kw) => cat.includes(kw));
}

export default async function Home() {
  const liveProducts = await getAllProducts();

  const products = liveProducts || [];

  // ── Serve-stale-on-error guard ───────────────────────────────────────────
  // At RUNTIME: if WooCommerce is unreachable during a background revalidation,
  // the fetch layer returns an empty list. Rendering that would cache an EMPTY
  // homepage, so we keep serving the last good version and retry later.
  //
  // ── Empty-catalogue handling ──────────────────────────────────────────────
  // The catalogue can come back empty if WooCommerce is briefly unreachable.
  // We do NOT hard-throw a 500: the page renders its shell and shows a friendly
  // notice; ISR (revalidate=300) refills the catalogue automatically.
  const catalogueEmpty = products.length === 0;

  // ── Section datasets (one fetch, filtered in memory) ──────────────────────
  const offerPicks = products.filter((p) => p.is_sale);

  const beers       = products.filter((p) => inCategory(p, ["beer", "cider"]));
  const champagnes  = products.filter((p) => inCategory(p, ["champagne", "sparkling", "prosecco"]));
  const wines       = products.filter((p) => inCategory(p, ["wine"]) && !inCategory(p, ["sparkling", "champagne"]));
  const whiskies    = products.filter((p) => inCategory(p, ["whisk", "bourbon", "scotch"]));
  const ginsVodkas  = products.filter((p) => inCategory(p, ["gin", "vodka"]));
  const darkSpirits = products.filter((p) => inCategory(p, ["cognac", "brandy", "rum", "tequila"]));
  const creams      = products.filter((p) => inCategory(p, ["cream", "liqueur", "bitter"]));

  return (
    <main className="min-h-screen bg-kafunda-bone">
      {/* 1 ── Hero: image-led, minimal copy */}
      <Hero />

      {/* Empty-catalogue notice (only when Woo is briefly unreachable) */}
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

      {/* 2 ── Today's Offers (moved up: first thing after the hero) */}
      <CategoryShelf
        title="Today's Offers"
        accentWord="Offers"
        eyebrow="Limited Time"
        products={offerPicks}
        viewAllHref="/shop?filter=offers"
        textured
      />

      {/* 3 ── Beers */}
      <CategoryShelf
        title="Beers & Ciders"
        accentWord="Beers"
        products={beers}
        viewAllHref="/shop?category=Beers"
      />

      {/* 4 ── Champagnes */}
      <CategoryShelf
        title="Champagnes & Sparkling"
        accentWord="Champagnes"
        products={champagnes}
        viewAllHref="/shop?category=Champagnes"
      />

      {/* ── Promo banner: mid-page break ── */}
      <PromoBanner
        eyebrow="Limited Time"
        line1="Up to"
        accent="30% off"
        line2="special offers"
        ctaLabel="Shop all deals"
        href="/shop?filter=offers"
      />

      {/* 5 ── The remaining drink types */}
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
        viewAllHref="/shop?category=Whiskys"
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

      <RecommendedForYou />

      {/* 6 ── Brands marquee (moved down: near the footer) */}
      <BrandMarquee />

      {/* 7 ── Recently viewed */}
      <RecentlyViewed />
    </main>
  );
}