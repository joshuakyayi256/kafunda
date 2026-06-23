/**
 * search-intent.ts  ->  src/lib/search-intent.ts
 *
 * "Smart" search WITHOUT any AI/API. It expands a customer's natural-language
 * query into matching terms + sort hints using hand-written maps over the data
 * you already have (name, category, brand, description, price, volume).
 *
 * Used by BOTH /api/search (navbar suggestions) and /shop (full results) so
 * search behaves identically everywhere.
 *
 * Examples it now understands:
 *   "smooth whisky for a gift"  -> whisky terms + premium price sort
 *   "sweet red for a party"     -> sweet+red wine terms + large-volume boost
 *   "cheap gin"                 -> gin + ascending price sort
 *   "bubbly"                    -> champagne/sparkling/prosecco
 */

import type { Product } from "@/types";

/** Words -> extra terms to match against name/category/brand/description. */
const SYNONYMS: Record<string, string[]> = {
  // categories / drink types
  bubbly: ["champagne", "sparkling", "prosecco", "cava"],
  fizz: ["champagne", "sparkling", "prosecco"],
  whiskey: ["whisky", "bourbon", "scotch"],
  whisky: ["whisky", "bourbon", "scotch"],
  spirit: ["whisky", "gin", "vodka", "rum", "tequila", "brandy", "cognac"],
  spirits: ["whisky", "gin", "vodka", "rum", "tequila", "brandy", "cognac"],
  liquor: ["whisky", "gin", "vodka", "rum", "tequila", "brandy", "cognac"],
  hard: ["whisky", "gin", "vodka", "rum", "tequila", "brandy", "cognac"],
  soft: ["juice", "water", "soda", "mixer", "non-alcoholic"],
  mixer: ["soda", "tonic", "juice", "water"],
  // flavour / style descriptors -> match in name/description
  smooth: ["smooth", "blended", "cream", "aged", "reserve"],
  sweet: ["sweet", "cream", "liqueur"],
  dry: ["dry", "brut"],
  strong: ["strong", "extreme", "overproof"],
  red: ["red", "merlot", "cabernet", "shiraz"],
  white: ["white", "chardonnay", "sauvignon"],
  rose: ["rose", "rosato"],
};

/** Occasion / intent words -> matching terms (loose, best-effort). */
const INTENT_TERMS: Record<string, string[]> = {
  gift: ["reserve", "premium", "xo", "single malt", "aged"],
  celebration: ["champagne", "sparkling", "prosecco"],
  party: ["pack", "5l", "1.5l", "case"],
  wedding: ["champagne", "sparkling", "wine"],
  dinner: ["wine", "red", "white"],
};

/** Price-sort hints from intent words. */
type PriceSort = "asc" | "desc" | null;
function priceSortFromQuery(words: string[]): PriceSort {
  const cheap = ["cheap", "cheapest", "affordable", "budget", "low", "inexpensive"];
  const premium = ["premium", "luxury", "expensive", "high-end", "top", "best", "finest", "gift"];
  if (words.some((w) => cheap.includes(w))) return "asc";
  if (words.some((w) => premium.includes(w))) return "desc";
  return null;
}

/** "party"/"bulk" should favour large volumes. */
function volumeBoostFromQuery(words: string[]): boolean {
  return words.some((w) => ["party", "bulk", "case", "crate"].includes(w));
}

export interface ParsedQuery {
  /** All terms to match (original words + expansions), deduped. */
  terms: string[];
  priceSort: PriceSort;
  volumeBoost: boolean;
  /** The raw cleaned query (for plain substring fallback). */
  raw: string;
}

const STOPWORDS = new Set([
  "a", "an", "the", "for", "of", "to", "and", "or", "with", "me", "my",
  "some", "something", "i", "want", "need", "looking", "good", "nice",
  "under", "around", "about", "that", "is", "are",
]);

/** Parse a natural-language query into match terms + sort hints. */
export function parseQuery(rawInput: string): ParsedQuery {
  const raw = rawInput.trim().toLowerCase().slice(0, 80);
  const words = raw.split(/\s+/).filter((w) => w && !STOPWORDS.has(w));

  const terms = new Set<string>();
  for (const w of words) {
    terms.add(w);
    if (SYNONYMS[w]) SYNONYMS[w].forEach((t) => terms.add(t));
    if (INTENT_TERMS[w]) INTENT_TERMS[w].forEach((t) => terms.add(t));
  }

  return {
    terms: [...terms],
    priceSort: priceSortFromQuery(words),
    volumeBoost: volumeBoostFromQuery(words),
    raw,
  };
}

/** Score a product against a parsed query. Higher = better match. */
export function scoreProductSmart(p: Product, parsed: ParsedQuery): number {
  const name = (p.name || "").toLowerCase();
  const category = (p.category || "").toLowerCase();
  const brand = (p.brand || "").toLowerCase();
  const description = (p.description || "").toLowerCase();
  const volume = (p.volume || "").toLowerCase();

  let s = 0;

  for (const term of parsed.terms) {
    if (!term) continue;
    // Weight by where the term hits: name/brand strongest, then category, desc.
    if (name.startsWith(term)) s += 50;
    else if (name.split(/\s+/).some((w) => w.startsWith(term))) s += 35;
    else if (name.includes(term)) s += 25;
    if (brand.includes(term)) s += 25;
    if (category.includes(term)) s += 20;
    if (description.includes(term)) s += 8;
  }

  // Plain whole-query substring fallback (covers exact phrase typing).
  if (parsed.raw && (name.includes(parsed.raw) || category.includes(parsed.raw))) {
    s += 30;
  }

  if (s === 0) return 0;

  // Light boosts
  if (p.in_stock) s += 5;
  if (parsed.volumeBoost && /\b(5l|1\.5l|case|crate|pack)\b/.test(volume + " " + name)) s += 15;

  return s;
}

/** Full smart filter+sort for a product list. */
export function smartSearch(products: Product[], rawInput: string): Product[] {
  const parsed = parseQuery(rawInput);
  if (parsed.terms.length === 0 && !parsed.raw) return products;

  const scored = products
    .map((p) => ({ p, s: scoreProductSmart(p, parsed) }))
    .filter(({ s }) => s > 0);

  scored.sort((a, b) => {
    // Primary: price sort hint if present
    if (parsed.priceSort === "asc") return a.p.price_ugx - b.p.price_ugx;
    if (parsed.priceSort === "desc") return b.p.price_ugx - a.p.price_ugx;
    // Otherwise: relevance score
    return b.s - a.s;
  });

  return scored.map(({ p }) => p);
}