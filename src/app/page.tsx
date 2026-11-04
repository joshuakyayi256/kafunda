// Render on-demand (not at build time) and cache the result for 5 minutes.
// `force-dynamic` ensures `next build` NEVER reaches out to WooCommerce, so a
// transient Woo 403/SSL/network blip (or a greylisted build IP) can't fail the
// deploy. The first real request fills the cache; ISR keeps it fast after that.
export const dynamic = "force-dynamic";
export const revalidate = 300;

import Hero from "@/components/shared/Hero";
import BrandMarquee from "@/components/shared/BrandMarquee";
import CategoryShelf from "@/components/shared/CategoryShelf";
import RecentlyViewed from "@/components/shared/RecentlyViewed";
import RecommendedForYou from "@/components/shared/RecommendedForYou";
import BlackNovemberHero from "@/components/home/BlackNovemberHero";
import QuickCategories from "@/components/home/QuickCategories";
import DealsGrid from "@/components/home/DealsGrid";
import TrustStrip from "@/components/home/TrustStrip";
import WhatsAppBand from "@/components/home/WhatsAppBand";
import { getAllProducts } from "@/lib/api";
import { CAMPAIGN, campaignLive } from "@/lib/campaign";
import { Product } from "@/types";

/** Case-insensitive: does the product's category string contain any keyword? */
function inCategory(p: Product, keywords: string[]): boolean {
  const cat = p.category?.toLowerCase() || "";
  return keywords.some((kw) => cat.includes(kw));
}

/** Day number since 1970 — changes the rotating picks once a day. (The page is ISR-cached, so this runs per regeneration, not per visitor.) */
function dayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function discount(p: Product): number {
  return p.original_price_ugx ? 1 - p.price_ugx / p.original_price_ugx : 0;
}

/**
 * Homepage, built for paid traffic (Nov 2026 redesign):
 *  1. Campaign hero (Black November) — one offer, countdown, real bottles
 *  2. One-tap category tiles
 *  3. Trust strip — delivery time, pay on delivery, stores, free delivery
 *  4. Deals GRID (biggest discounts first) — visible without swiping
 *  5. Price-led shelf (Under UGX 50k) + best-selling categories
 *  6. WhatsApp ordering band, then the rest of the catalogue
 * Outside a campaign window the normal photo hero returns automatically.
 */
export default async function Home() {
  // getAllProducts() THROWS when Woo is unreachable. Catch it so a Woo/Cloudflare
  // blip shows the "being restocked" notice below instead of a 500 page.
  const products = await getAllProducts().catch((err) => {
    console.error("[home] Catalogue unavailable — rendering without products:", err);
    return [] as Product[];
  });
  const catalogueEmpty = products.length === 0;
  const live = campaignLive();

  const sellable = products.filter((p) => p.in_stock && p.price_ugx > 0 && p.image_url);

  // ── Deals: real sale prices from WooCommerce, biggest % off first ─────────
  const deals = sellable
    .filter((p) => p.is_sale || p.is_today_offer || discount(p) > 0)
    .sort((a, b) => discount(b) - discount(a));
  const hasDeals = deals.length > 0;

  // Pools change daily; each visitor's browser then picks at random from them,
  // so the hero and the picks grid look different on every visit.
  const day = dayIndex();
  const rotate = <T,>(arr: T[]) => {
    if (!arr.length) return arr;
    const start = (day * 7) % arr.length;
    return [...arr.slice(start), ...arr.slice(0, start)];
  };

  // Hero: good-looking bottles (UGX 50k+, in stock, with a photo) → 3 random.
  const heroPool = rotate(sellable.filter((p) => p.price_ugx >= 50_000)).slice(0, 24);
  // Picks grid: any in-stock bottle from UGX 20k (skips water/mixers) → 8 random.
  const gridPool = rotate(sellable.filter((p) => p.price_ugx >= 20_000)).slice(0, 60);

  const under50k = sellable
    .filter((p) => p.price_ugx <= 50_000)
    .sort((a, b) => discount(b) - discount(a) || b.price_ugx - a.price_ugx);

  const beers       = products.filter((p) => inCategory(p, ["beer", "cider"]));
  const champagnes  = products.filter((p) => inCategory(p, ["champagne", "sparkling", "prosecco"]));
  const wines       = products.filter((p) => inCategory(p, ["wine"]) && !inCategory(p, ["sparkling", "champagne"]));
  const whiskies    = products.filter((p) => inCategory(p, ["whisk", "bourbon", "scotch"]));
  const ginsVodkas  = products.filter((p) => inCategory(p, ["gin", "vodka"]));
  const darkSpirits = products.filter((p) => inCategory(p, ["cognac", "brandy", "rum", "tequila"]));
  const creams      = products.filter((p) => inCategory(p, ["cream", "liqueur", "bitter"]));

  // Products per brand, so the marquee only shows brands we actually stock.
  const brandCounts = catalogueEmpty
    ? undefined
    : products.reduce<Record<string, number>>((acc, p) => {
        acc[p.brand] = (acc[p.brand] ?? 0) + 1;
        return acc;
      }, {});

  return (
    <main className="min-h-screen bg-kafunda-bone">
      {live ? <BlackNovemberHero pool={heroPool.length >= 3 ? heroPool : sellable.slice(0, 24)} hasDeals={hasDeals} /> : <Hero />}

      <QuickCategories />

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

      <div className="pt-4 md:pt-6">
        <TrustStrip />
      </div>

      <DealsGrid
        pool={gridPool}
        count={8}
        eyebrow={live ? CAMPAIGN.name : "Top picks"}
        title={
          live ? (
            <>Black November <span className="text-primary-red">Picks</span></>
          ) : (
            <>Today&apos;s <span className="text-primary-red">Picks</span></>
          )
        }
        note="A fresh selection every visit — delivered in 1–2 hours."
        href="/shop"
      />

      <CategoryShelf
        title="Great Bottles Under 50k"
        accentWord="Under 50k"
        eyebrow="Easy on the wallet"
        products={under50k}
        viewAllHref="/shop?maxPrice=50000"
        textured
      />

      <CategoryShelf title="Whiskies & Bourbons" accentWord="Whiskies" products={whiskies} viewAllHref="/shop?category=Whiskys" />
      <CategoryShelf title="Beers & Ciders" accentWord="Beers" products={beers} viewAllHref="/shop?category=Beers" />

      <WhatsAppBand campaign={live ? CAMPAIGN.name : undefined} />

      <CategoryShelf title="Fine Wines" accentWord="Wines" products={wines} viewAllHref="/shop?category=Wines" />
      <CategoryShelf title="Champagnes & Sparkling" accentWord="Champagnes" products={champagnes} viewAllHref="/shop?category=Champagnes" />
      <CategoryShelf title="Gins & Vodkas" accentWord="Gins" products={ginsVodkas} viewAllHref="/shop?category=Gins" />
      <CategoryShelf
        title="Cognacs, Rums & Tequilas"
        accentWord="Cognacs"
        products={darkSpirits}
        viewAllHref="/shop?category=Cognacs"
        textured
      />
      <CategoryShelf title="Creams & Liqueurs" accentWord="Creams" products={creams} viewAllHref="/shop?category=Creams" />

      <RecommendedForYou />
      <BrandMarquee counts={brandCounts} />
      <RecentlyViewed />
    </main>
  );
}
