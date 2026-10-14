// src/lib/brands.ts
/**
 * Featured brands + brand detection.
 * ------------------------------------------------------------------
 * WooCommerce has no brand field on our products, so the brand is detected
 * from the product NAME ("Hennessy VS 700ml" -> "Hennessy"). The same list
 * drives the home-page brand marquee, the /shop?brand= filter and the brand
 * label on product pages, so a logo click always lands on real products.
 *
 * `logo` is the file in /public/logos/. `aliases` catch alternate spellings
 * found in product names; matching ignores case, accents, spaces and
 * punctuation ("Jack Daniel's" == "jack daniels", "Jägermeister" ==
 * "jagermeister").
 */
export interface Brand {
  name: string;
  logo: string;
  aliases?: string[];
}

export const BRANDS: Brand[] = [
  { name: "Hennessy", logo: "/logos/Hennessy-Logo-PNG-Photo.png" },
  { name: "Johnnie Walker", logo: "/logos/johnny.webp", aliases: ["Johnny Walker"] },
  { name: "Jameson", logo: "/logos/jameson.png" },
  { name: "Don Julio", logo: "/logos/don-julio.png" },
  { name: "Grey Goose", logo: "/logos/grey.webp" },
  { name: "Belvedere", logo: "/logos/belvedere.webp" },
  { name: "Captain Morgan", logo: "/logos/Captain-Morgan-Symbol.png" },
  { name: "Uganda Waragi", logo: "/logos/uganda-waragi.jpg" },
  { name: "Smirnoff", logo: "/logos/smirnoff.png" },
  { name: "Jack Daniels", logo: "/logos/jack-daniels.png" },
  { name: "Martell", logo: "/logos/martell.png" },
  { name: "Chivas", logo: "/logos/chivas.png" },
  { name: "Ciroc", logo: "/logos/ciroc.png" },
  { name: "Baileys", logo: "/logos/baileys.png" },
  { name: "Absolut", logo: "/logos/absolut.jfif" },
  { name: "Jagermeister", logo: "/logos/jagermeister.png" },
  { name: "Amarula", logo: "/logos/amarula.jfif" },
  { name: "Singleton", logo: "/logos/singleton.jfif" },
  { name: "Grants", logo: "/logos/grants.png" },
  { name: "Roe & Co", logo: "/logos/roe-and-co.png" },
  { name: "Monin", logo: "/logos/monin.jfif" },
];

/** Lowercase, strip accents and everything that isn't a letter or digit. */
export function brandKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const MATCHERS = BRANDS.map((b) => ({
  name: b.name,
  keys: [b.name, ...(b.aliases ?? [])].map(brandKey),
}));

/** The featured brand a product name belongs to, or null. */
export function detectBrand(productName: string): string | null {
  const key = brandKey(productName);
  const hit = MATCHERS.find((m) => m.keys.some((k) => key.includes(k)));
  return hit ? hit.name : null;
}

/** Does this product belong to the brand (by detected brand or by name)? */
export function matchesBrand(product: { name: string; brand: string }, brand: string): boolean {
  const want = brandKey(brand);
  if (!want) return true;
  return brandKey(product.brand) === want || brandKey(product.name).includes(want);
}
