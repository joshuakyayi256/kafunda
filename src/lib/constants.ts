/**
 * Kafunda Wines & Spirits — Site Constants
 * ─────────────────────────────────────────
 * All real business details live here.
 * To update a phone number, address, or social link,
 * change it once in this file — it propagates everywhere.
 */

export const SITE = {
  name: "Kafunda Wines & Spirits",
  tagline: "Uganda's premier destination for wines, spirits & fine drinks.",
  url: "https://kafundawines.com",
  email: "info@kafundawines.com",
  description: "Buy Beer, Spirits and Wine Online — Shop Drinks in Uganda.",
} as const;

export const CONTACT = {
  phone: "+256 785 498 279",
  phoneDial: "+256785498279",
  whatsapp: "https://wa.me/256785498279",
  email: "info@kafundawines.com",
  address: "Mpererwe, Lusanja-Kiteezi Road",
  city: "Kampala, Uganda",
  hours: {
    weekday: "Mon – Sat: 9 am – 10 pm",
    weekend: "Sunday: 11 am – 8 pm",
  },
} as const;

export const SOCIAL = {
  facebook: "https://www.facebook.com/p/Kafunda-Wine-Store-Spirits-100063554799924/",
  twitter: "https://twitter.com/KafundaStore",
  instagram: "https://www.instagram.com/kafundawines/",
  tiktok: "https://www.tiktok.com/@kafundawines",
} as const;

export const DELIVERY = {
  fee: 5_000,
  freeThreshold: 500_000,
  estimatedTime: "1–2 hours",
  partner: "Also available on Glovo",
  recommendation: "99% recommendation rate",
} as const;

export const CATEGORIES = [
  "Wines",
  "Whiskies",
  "Creams",
  "Cognacs",
  "Vodkas",
  "Champagnes",
  "Beers",
  "Soft Drinks",
  "Gins",
  "Rums",
  "Tequilas",
  "Bitters",
] as const;

export const DELIVERY_ZONES = [
  {
    id: "zone1",
    name: "Kampala Central",
    areas: "CBD, Nakasero, Kololo, Kamwokya",
    fee: 3_000,
  },
  {
    id: "zone2",
    name: "Inner Suburbs",
    areas: "Ntinda, Bukoto, Bugolobi, Kisementi, Naguru",
    fee: 5_000,
  },
  {
    id: "zone3",
    name: "Outer Suburbs",
    areas: "Kireka, Namugongo, Makindye, Nsambya, Munyonyo",
    fee: 8_000,
  },
  {
    id: "zone4",
    name: "Greater Kampala",
    areas: "Gayaza, Wakiso, Nansana, Kyengera, Mukono area",
    fee: 12_000,
  },
] as const;
