/**
 * Browser-side marketing signals, in one place:
 *  - Google Ads / GA4 events (add_to_cart, begin_checkout, purchase) so ad
 *    campaigns can optimise for real sales on this site
 *  - OneSignal tags that power the abandoned-cart push Journey
 *  - the push opt-in prompt
 *  - the abandoned-cart token
 *
 * Every function is a safe no-op when the relevant script isn't loaded or
 * its env var isn't set — tracking must never break shopping.
 */

import type { CartItem, Product } from "@/types";

type Gtag = (...args: unknown[]) => void;
interface OneSignalLike {
  User: {
    addTags(tags: Record<string, string>): void;
    removeTags(keys: string[]): void;
    PushSubscription: { optedIn?: boolean };
  };
  Slidedown: { promptPush(opts?: { force?: boolean }): Promise<void> };
  login(externalId: string): Promise<void>;
}

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
    OneSignalDeferred?: ((os: OneSignalLike) => void | Promise<void>)[];
  }
}

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
const ADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "";
const ONESIGNAL_ON = true; // App ID is built in (see MarketingScripts)

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") window.gtag(...args);
}

function onesignal(fn: (os: OneSignalLike) => void | Promise<void>) {
  if (typeof window === "undefined" || !ONESIGNAL_ON) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (os) => {
    try {
      await fn(os);
    } catch {
      // Blocked notifications, private mode, etc. — ignore.
    }
  });
}

function store(key: string, value?: string): string | null {
  try {
    if (value === undefined) return window.localStorage.getItem(key);
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
  return null;
}

const gaItem = (p: Product, quantity: number) => ({
  item_id: p.id,
  item_name: p.name,
  item_brand: p.brand,
  item_category: p.category,
  price: p.price_ugx,
  quantity,
});

// ── Google Ads / GA4 ─────────────────────────────────────────────────────────

export function trackAddToCart(product: Product, quantity: number) {
  gtag("event", "add_to_cart", {
    currency: "UGX",
    value: product.price_ugx * quantity,
    items: [gaItem(product, quantity)],
  });
}

export function trackBeginCheckout(cart: CartItem[], value: number) {
  gtag("event", "begin_checkout", {
    currency: "UGX",
    value,
    items: cart.map((i) => gaItem(i, i.quantity)),
  });
}

/** Enhanced conversions: Google matches the sale to the ad click by hashed email/phone. */
export function setConversionUserData(email: string, phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "").replace(/^256/, "");
  gtag("set", "user_data", {
    ...(email ? { email: email.trim().toLowerCase() } : {}),
    ...(digits.length === 9 ? { phone_number: `+256${digits}` } : {}),
  });
}

/** Fires once per order (deduped in localStorage across reloads). */
export function trackPurchase(orderId: string, value: number, items: CartItem[] = []) {
  if (typeof window === "undefined" || !orderId) return;
  const key = "kafunda:conv-sent";
  const sent = (store(key) ?? "").split(",").filter(Boolean);
  if (sent.includes(orderId)) return;
  store(key, [...sent.slice(-19), orderId].join(","));

  gtag("event", "purchase", {
    transaction_id: orderId,
    currency: "UGX",
    value,
    items: items.map((i) => gaItem(i, i.quantity)),
  });
  if (ADS_ID && ADS_PURCHASE_LABEL) {
    gtag("event", "conversion", {
      send_to: `${ADS_ID}/${ADS_PURCHASE_LABEL}`,
      value,
      currency: "UGX",
      transaction_id: orderId,
    });
  }
  onesignal((os) => os.User.addTags({ last_order: String(Math.floor(Date.now() / 1000)) }));
}

// ── Purchase-tracking handoff for Pesapal's full-page redirect ───────────────
// The success page only knows the order ref; the value/items are parked here
// right before Pesapal opens.
const PENDING_CONV_KEY = "kafunda:pending-conversion";

export function parkConversion(orderRef: string, value: number, items: CartItem[]) {
  store(PENDING_CONV_KEY, JSON.stringify({ orderRef, value, items, at: Date.now() }));
}

export function firePendingConversion(orderRef: string) {
  try {
    const raw = store(PENDING_CONV_KEY);
    const parked = raw ? (JSON.parse(raw) as { orderRef: string; value: number; items: CartItem[] }) : null;
    if (parked && parked.orderRef === orderRef) trackPurchase(orderRef, parked.value, parked.items);
    else trackPurchase(orderRef, 0);
    window.localStorage.removeItem(PENDING_CONV_KEY);
  } catch {
    // ignore
  }
}

// ── OneSignal ────────────────────────────────────────────────────────────────

let tagTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Abandoned-cart push: OneSignal Journey enters users when `cart_update`
 * is set, waits, and sends the reminder if the tag is still there. Placing
 * the order (cart emptied) removes the tags, which exits the Journey.
 */
export function syncCartTags(cart: CartItem[]) {
  if (!ONESIGNAL_ON) return;
  clearTimeout(tagTimer);
  tagTimer = setTimeout(() => {
    onesignal((os) => {
      if (cart.length === 0) {
        os.User.removeTags(["cart_update", "cart_items", "cart_value", "cart_first_item"]);
        return;
      }
      os.User.addTags({
        cart_update: String(Math.floor(Date.now() / 1000)),
        cart_items: String(cart.reduce((n, i) => n + i.quantity, 0)),
        cart_value: String(cart.reduce((s, i) => s + i.price_ugx * i.quantity, 0)),
        cart_first_item: cart[0].name.slice(0, 60),
      });
    });
  }, 1500);
}

/** Links this browser to the customer (same id the app should use: 2567XXXXXXXX). */
export function identifyPushUser(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "").replace(/^256/, "");
  if (digits.length !== 9) return;
  onesignal((os) => os.login(`256${digits}`));
}

/**
 * Ask for push permission at a high-intent moment (after add-to-cart, after
 * ordering). OneSignal's slidedown is a soft prompt, so declining it doesn't
 * burn the browser's one-time permission dialog. Throttled to once per 3 days.
 */
export function maybePromptPush(delayMs = 3500, force = false) {
  if (!ONESIGNAL_ON || typeof window === "undefined") return;
  if (store("kafunda_age_verified") !== "true") return;
  const last = Number(store("kafunda:push-prompted") ?? 0);
  if (!force && Date.now() - last < 3 * 24 * 60 * 60 * 1000) return;
  setTimeout(() => {
    onesignal(async (os) => {
      if (os.User.PushSubscription.optedIn) return;
      store("kafunda:push-prompted", String(Date.now()));
      await os.Slidedown.promptPush(force ? { force: true } : undefined);
    });
  }, delayMs);
}

// ── Abandoned-cart token ─────────────────────────────────────────────────────

const CART_TOKEN_KEY = "kafunda:cart-token";

export function getCartToken(): string {
  let token = store(CART_TOKEN_KEY);
  if (!token) {
    token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    store(CART_TOKEN_KEY, token);
  }
  return token;
}

/** After an order: tell WordPress it converted and start a fresh token. */
export function markCartConverted(orderId?: string | number) {
  const token = store(CART_TOKEN_KEY);
  if (!token) return;
  try {
    window.localStorage.removeItem(CART_TOKEN_KEY);
  } catch {
    // ignore
  }
  const id = typeof orderId === "string" ? Number(orderId.replace(/\D/g, "")) : orderId;
  void fetch("/api/cart/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, converted: true, orderId: id || 0 }),
    keepalive: true,
  }).catch(() => undefined);
}
