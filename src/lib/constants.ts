/**
 * Kafunda Wines & Spirits - Site Constants
 * -----------------------------------------
 * All real business details live here.
 * To update a phone number, address, or social link,
 * change it once in this file - it propagates everywhere.
 */

export const SITE = {
  name: "Kafunda Wines & Spirits",
  tagline: "Uganda's premier destination for wines, spirits & fine drinks.",
  url: "https://kafundawines.com",
  email: "info@kafundawines.com",
  description: "Buy Beer, Spirits and Wine Online - Shop Drinks in Uganda.",
} as const;

export const CONTACT = {
  phone: "+256 785 498 279",
  phoneDial: "+256785498279",
  whatsapp: "https://wa.me/256785498279",
  email: "info@kafundawines.com",
  address: "Mpererwe, Lusanja-Kiteezi Road",
  city: "Kampala, Uganda",
  hours: {
    weekday: "Mon - Sat: 9 am - 10 pm",
    weekend: "Sunday: 11 am - 8 pm",
  },
} as const;

export const SOCIAL = {
  facebook: "https://www.facebook.com/p/Kafunda-Wine-Store-Spirits-100063554799924/",
  twitter: "https://twitter.com/KafundaStore",
  instagram: "https://www.instagram.com/kafundawines/",
  tiktok: "https://www.tiktok.com/@kafundawines",
} as const;

/**
 * Pesapal passes a ~3.5% processing fee to the merchant. Per business
 * decision this is folded into the amount due on ONLINE payments only
 * (never Cash on Delivery). Client and server both read this constant;
 * the server's calculation is authoritative.
 */
export const PESAPAL_SURCHARGE_RATE = 0.035;

/**
 * Physical stores delivery riders dispatch from. The Mapbox quote engine
 * (src/lib/delivery.ts) measures driving distance from the customer's pinned
 * location to the NEAREST store in this list.
 *
 * Coordinates below are REAL pins (confirmed via Google Maps, June 2026).
 * Update address/phone fields if any are missing or change.
 */
export const STORES = [
  {
    id: "makindye",
    name: "Kafunda — Makindye",
    address: "27-29 Mobutu Road, Makindye, Kampala",
    phone: "0701 813618",
    lat: 0.3042019884456162,
    lng: 32.6151318576705,
  },
  {
    id: "mpererwe",
    name: "Kafunda — Mpererwe",
    address: "Mpererwe, Kampala",
    phone: "0762 190594",
    lat: 0.29051841746378976,
    lng: 32.576091984648166,
  },
  {
    id: "kawempe",
    name: "Kafunda — Kawempe",
    address: "Kawempe, Kampala",
    phone: "0701 813618",
    lat: 0.3806998433916813,
    lng: 32.55835555766716,
  },
] as const;

/**
 * Delivery tariff — calibrated to real Kampala boda rates (June 2026).
 * Anchor: a real ~6 km trip (Namuwongo → Banda Rise) cost 6,000 UGX; these
 * values reproduce that so quotes feel fair, not scary.
 *
 *   fee = max(BASE + PER_KM × drivingKm, MIN), rounded up to ROUND_UP_TO.
 *
 * Sample quotes (driving km):
 *   2 km →  2,700 → 3,000      6 km →  6,100 → 6,000*    12 km → 11,200 → 11,500
 *   4 km →  4,400 → 4,500     10 km →  9,500 → 9,500     15 km → 13,750 → 14,000
 *   (*matches the real-world anchor)
 *
 * NOTE: distance is Mapbox DRIVING distance to the nearest STORE, so accurate
 * STORE coordinates matter as much as these rates — keep STORES correct.
 *
 * FREE_DELIVERY_THRESHOLD_UGX: orders whose GOODS SUBTOTAL (before surcharge)
 * is >= this value ship free — the distance-based fee is waived entirely.
 * Set to 0 to disable free delivery. The website currently advertises free
 * delivery over 100,000 UGX, so this matches that promise. To raise it to
 * 200,000, change ONLY this number (and update the marketing copy to match —
 * see FREE_DELIVERY note below).
 */
export const DELIVERY_FEE = {
  BASE_UGX: 1_000,
  PER_KM_UGX: 850,
  MIN_UGX: 2_000,
  ROUND_UP_TO_UGX: 500,
  MAX_RADIUS_KM: 30,
  FREE_DELIVERY_THRESHOLD_UGX: 100_000,
} as const;

/**
 * Marketing-facing copy for the free-delivery promise. Kept next to the
 * threshold so the words and the number can never drift apart again — this
 * exact drift (copy said one thing, checkout did another) is what caused
 * the "free delivery not applied" complaint. Any component that renders the
 * promise should read FREE_DELIVERY.label rather than hardcoding "100k".
 */
export const FREE_DELIVERY = {
  thresholdUgx: DELIVERY_FEE.FREE_DELIVERY_THRESHOLD_UGX,
  label: `Free delivery on orders over UGX ${DELIVERY_FEE.FREE_DELIVERY_THRESHOLD_UGX.toLocaleString()}`,
  shortLabel: `Free delivery over UGX ${(DELIVERY_FEE.FREE_DELIVERY_THRESHOLD_UGX / 1000).toFixed(0)}k`,
} as const;

/**
 * Single source of truth for whether an order qualifies for free delivery.
 * Both the live quote endpoint and the authoritative checkout recalculation
 * MUST use this — never inline the comparison — so the rule stays in one place.
 */
export function qualifiesForFreeDelivery(goodsSubtotalUgx: number): boolean {
  const threshold = DELIVERY_FEE.FREE_DELIVERY_THRESHOLD_UGX;
  return threshold > 0 && goodsSubtotalUgx >= threshold;
}

export const DELIVERY = {
  estimatedTime: "1-2 hours",
  recommendation: "99% recommendation rate",
  // Fee is auto-quoted from the customer's pinned location (see STORES /
  // DELIVERY_FEE). If no pin is given, it's confirmed by phone instead.
  note: "Pin your location for an instant delivery fee — otherwise we confirm it by phone.",
} as const;

export const CATEGORIES = [
  "Wines", "Whiskies", "Creams", "Cognacs", "Vodkas", "Champagnes",
  "Beers", "Soft Drinks", "Gins", "Rums", "Tequilas", "Bitters",
] as const;

/**
 * LEGACY — delivery zones from the quote-on-call era. No longer used by
 * checkout (replaced by the Mapbox location pin) but kept as reference
 * for the rider team / any copy that still mentions areas.
 */
export const DELIVERY_ZONES = [
  { id: "zone1", name: "Kampala Central", areas: "CBD, Nakasero, Kololo, Kamwokya" },
  { id: "zone2", name: "Inner Suburbs",   areas: "Ntinda, Bukoto, Bugolobi, Kisementi, Naguru" },
  { id: "zone3", name: "Outer Suburbs",   areas: "Kireka, Namugongo, Makindye, Nsambya, Munyonyo" },
  { id: "zone4", name: "Greater Kampala", areas: "Gayaza, Wakiso, Nansana, Kyengera, Mukono area" },
] as const;

/**
 * Per-category visual styling for the scrolling category marquee.
 * `bg` and `text` are Tailwind utility classes that reference the
 * Vintage palette tokens defined in globals.css.
 *
 * Keys are matched case-insensitively against the lowercased category name.
 * Unknown categories fall back to CATEGORY_STYLE_DEFAULT.
 */
export const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  wines:           { bg: "bg-[var(--color-kafunda-burgundy)]",     text: "text-white",                                  icon: "🍷" },
  "red wines":     { bg: "bg-[var(--color-kafunda-burgundy)]",     text: "text-white",                                  icon: "🍷" },
  "dry red wines": { bg: "bg-[var(--color-kafunda-burgundy)]",     text: "text-white",                                  icon: "🍷" },
  "sweet red wines":{bg: "bg-[var(--color-kafunda-burgundy)]",     text: "text-white",                                  icon: "🍷" },
  "white wines":   { bg: "bg-[var(--color-kafunda-cream)]",        text: "text-[var(--color-kafunda-burgundy)]",        icon: "🥂" },
  "dry white wines":{bg: "bg-[var(--color-kafunda-cream)]",        text: "text-[var(--color-kafunda-burgundy)]",        icon: "🥂" },
  champagnes:      { bg: "bg-[var(--color-kafunda-cream-soft)]",   text: "text-[var(--color-kafunda-burgundy)]",        icon: "🍾" },
  "sparkling wines":{bg:"bg-[var(--color-kafunda-cream-soft)]",    text: "text-[var(--color-kafunda-burgundy)]",        icon: "🍾" },
  whiskies:        { bg: "bg-[var(--color-kafunda-mustard)]",      text: "text-[var(--color-kafunda-burgundy)]",        icon: "🥃" },
  cognacs:         { bg: "bg-[var(--color-kafunda-burnt)]",        text: "text-white",                                  icon: "🥃" },
  rums:            { bg: "bg-[var(--color-kafunda-burnt)]",        text: "text-white",                                  icon: "🍹" },
  tequilas:        { bg: "bg-[var(--color-kafunda-mustard)]",      text: "text-[var(--color-kafunda-burgundy)]",        icon: "🌵" },
  vodkas:          { bg: "bg-white",                               text: "text-[var(--color-kafunda-burgundy)]",        icon: "❄️" },
  gins:            { bg: "bg-[var(--color-kafunda-olive)]",        text: "text-white",                                  icon: "🌿" },
  creams:          { bg: "bg-[var(--color-kafunda-peach)]",        text: "text-[var(--color-kafunda-burgundy)]",        icon: "🍮" },
  beers:           { bg: "bg-brand-green",                         text: "text-white",                                  icon: "🍺" },
  ciders:          { bg: "bg-brand-green",                         text: "text-white",                                  icon: "🍏" },
  "soft drinks":   { bg: "bg-sky-100",                             text: "text-sky-900",                                icon: "🥤" },
  juices:          { bg: "bg-[var(--color-kafunda-mustard)]",      text: "text-[var(--color-kafunda-burgundy)]",        icon: "🍊" },
  water:           { bg: "bg-sky-50",                              text: "text-sky-900",                                icon: "💧" },
  mixers:          { bg: "bg-sky-50",                              text: "text-sky-900",                                icon: "💧" },
  "energy drinks": { bg: "bg-[var(--color-kafunda-burnt)]",        text: "text-white",                                  icon: "⚡" },
  bitters:         { bg: "bg-[var(--color-kafunda-olive)]",        text: "text-white",                                  icon: "🌱" },
  "cocktail syrups":{bg: "bg-[var(--color-kafunda-peach)]",        text: "text-[var(--color-kafunda-burgundy)]",        icon: "🍸" },
  "disposables & more":{bg:"bg-zinc-100",                          text: "text-zinc-700",                               icon: "🥡" },
};

export const CATEGORY_STYLE_DEFAULT = {
  bg: "bg-[var(--color-kafunda-cream)]",
  text: "text-[var(--color-kafunda-burgundy)]",
  icon: "✨",
} as const;

/** Resolve styling for a category name (case-insensitive). */
export function getCategoryStyle(name: string) {
  return CATEGORY_STYLES[name.toLowerCase().trim()] ?? CATEGORY_STYLE_DEFAULT;
}