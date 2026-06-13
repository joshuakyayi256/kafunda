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
 * (src/lib/delivery.ts) measures driving distance from the customer's
 * pinned location to the NEAREST store in this list.
 *
 * ⚠️ COORDINATES ARE A PLACEHOLDER near Mpererwe / Lusanja-Kiteezi Rd.
 * Before launch: open Google Maps, right-click the exact shop entrance,
 * "copy coordinates", and paste the real lat/lng here. The entire fee
 * calculation keys off this point. Add more entries if branches open.
 */
export const STORES = [
  {
    id: "mpererwe",
    name: "Kafunda — Mpererwe",
    address: "Mpererwe, Lusanja-Kiteezi Road, Kampala",
    lat: 0.3946,  // TODO: replace with exact pin
    lng: 32.5742, // TODO: replace with exact pin
  },
] as const;

/**
 * Distance-based delivery tariff (UGX), applied to Mapbox DRIVING distance
 * from the nearest store. Tune freely — both the live checkout quote and
 * the server's authoritative recalculation read these same numbers.
 *
 *   fee = BASE_UGX + PER_KM_UGX × km
 *   fee = max(fee, MIN_UGX), rounded UP to the nearest ROUND_UP_TO_UGX
 *
 * Beyond MAX_RADIUS_KM (or when the customer doesn't pin a location, or
 * Mapbox is unreachable) checkout falls back to the previous behaviour:
 * the fee is quoted on the confirmation call.
 */
export const DELIVERY_FEE = {
  BASE_UGX: 3_000,
  PER_KM_UGX: 1_200,
  MIN_UGX: 5_000,
  ROUND_UP_TO_UGX: 500,
  MAX_RADIUS_KM: 30,
} as const;

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