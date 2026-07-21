// src/lib/api.ts
import { Product } from "@/types";
import { decodeEntities } from "@/lib/utils";
import fallbackProducts from "@/data/products.json";

const RAW_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com";
const BASE_URL = RAW_URL.replace(/\/graphql\/?$/, "");
const HOSTNAME  = new URL(BASE_URL).hostname;

const ORIGIN_IP = process.env.WP_ORIGIN_IP;
const AUTH_USER = process.env.WC_CONSUMER_KEY || process.env.WP_APP_USER;
const AUTH_PASS = process.env.WC_CONSUMER_SECRET || process.env.WP_APP_PASS;

/**
 * WAF SIDESTEP - with WP_CUSTOM_API=1 + KAFUNDA_CORE_KEY set (and the
 * kafunda-core plugin active in WordPress), catalogue READS are routed to
 * /wp-json/kafunda/v1/* authenticated by a shared-secret query param.
 * That namespace + auth style avoids the WAF rules that 403 the wc/v3
 * namespace and Authorization headers. Writes (order creation) always
 * stay on wc/v3 with the WooCommerce keys.
 */
const CUSTOM_API_KEY = process.env.KAFUNDA_CORE_KEY || "";
const USE_CUSTOM_API = process.env.WP_CUSTOM_API === "1" && CUSTOM_API_KEY.length > 0;

/**
 * DEV ESCAPE HATCH — when WooCommerce is unreachable (SSL chain / WAF
 * blocks), serve the bundled sample catalogue (src/data/products.json) so
 * UI work can continue. AUTOMATIC in development; set FALLBACK_CATALOGUE=0
 * to disable, or FALLBACK_CATALOGUE=1 to force-enable elsewhere.
 * It only activates AFTER a live fetch has failed, so it never masks real
 * data. NEVER enable in Vercel/production: fallback product ids do not
 * exist in Woo, so checkout would always fail.
 */
const USE_FALLBACK =
  process.env.FALLBACK_CATALOGUE === "1" ||
  (process.env.NODE_ENV === "development" && process.env.FALLBACK_CATALOGUE !== "0");

/**
 * TRANSPORT RETRY POLICY
 * ----------------------------------------------------------------------
 * Production logs show intermittent ETIMEDOUT / ECONNRESET / socket-closed
 * failures on server-to-server calls to Cloudflare (172.67.x.x). These are
 * transport-layer drops, not application errors — the same request usually
 * succeeds moments later.
 *
 * Retry ONLY on transport failures (status 0) and 5xx / 429. Never retry a
 * 4xx: a 401/403/404 will fail identically on the second attempt and just
 * doubles latency. Jittered backoff so concurrent page renders don't
 * retry in lockstep and hammer the origin.
 *
 * NOTE: this is mitigation, not a cure. The real fix is setting
 * WP_ORIGIN_IP in Vercel so these calls bypass Cloudflare entirely.
 */
const RETRY_DELAYS_MS = [300, 900]; // 2 retries → 3 attempts total
const REQUEST_TIMEOUT_MS = 12_000;

function shouldRetry(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  // ±25% jitter to avoid synchronized retry storms across concurrent renders.
  const jittered = ms * (0.75 + Math.random() * 0.5);
  return new Promise((r) => setTimeout(r, jittered));
}

function getFallbackProducts(): Product[] {
  // products.json already matches the Product shape; just ensure stock_count.
  return (fallbackProducts as Product[]).map((p) => ({ stock_count: 5, ...p }));
}

function getFallbackCategories(): WPCategory[] {
  const names = Array.from(
    new Set(getFallbackProducts().map((p) => p.category).filter(Boolean))
  );
  return names.map((name, i) => ({
    id: `fallback-${i}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    image: null,
  }));
}

interface RawResult {
  ok: boolean;
  status: number;
  data: unknown;
}

/**
 * Single HTTP attempt. Never throws — transport failures come back as
 * { ok: false, status: 0 } so the retry layer can distinguish them from
 * real HTTP errors.
 */
async function attemptWooREST(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  opts: { noStore?: boolean; tags?: string[] }
): Promise<RawResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      ...(opts.noStore
        ? { cache: "no-store" as const }
        : { next: { revalidate: 3600, tags: opts.tags ?? ["products"] } }),
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: unknown = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const log = USE_FALLBACK ? console.warn : console.error;
      log(`[api] WooCommerce HTTP ${res.status} on ${url.split("/wp-json/")[1] ?? url}`, text.slice(0, 400));
    }

    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[api] WooCommerce transport failure: ${reason}`);
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Low-level WooCommerce REST call that ALWAYS reports what happened.
 * Returns { ok, status, data } so callers can tell the difference between
 * "the request failed" and "the request succeeded but returned nothing".
 *
 * Retries transport failures and 5xx/429 with jittered backoff.
 *
 * By default responses are cached for 1h (good for the catalogue). Pass
 * { noStore: true } for anything that must read live data (checkout, stock).
 */
async function fetchWooRESTRaw(
  endpoint: string,
  method: string = "GET",
  body?: unknown,
  opts: { noStore?: boolean; tags?: string[] } = {}
): Promise<RawResult> {
  // Catalogue reads can run on the custom namespace without WC keys.
  const isCatalogueRead = method === "GET" && endpoint.startsWith("products");
  const useCustomApi = USE_CUSTOM_API && isCatalogueRead;

  if (!useCustomApi && (!AUTH_USER || !AUTH_PASS)) {
    throw new Error(
      "Authentication credentials not found. " +
      "Please set WC_CONSUMER_KEY and WC_CONSUMER_SECRET in Vercel."
    );
  }

  const base64Auth = Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString("base64");
  const urlBase = ORIGIN_IP ? `http://${ORIGIN_IP}` : BASE_URL;

  // WAF workaround: some host firewalls block Authorization headers hitting
  // /wp-json. With WC_QUERY_AUTH=1, send the WooCommerce keys as query
  // parameters instead (supported by Woo over HTTPS). Only valid with real
  // ck_/cs_ keys — WordPress application passwords require Basic auth.
  const useQueryAuth =
    !useCustomApi &&
    process.env.WC_QUERY_AUTH === "1" &&
    !!AUTH_USER &&
    AUTH_USER.startsWith("ck_");
  const joiner = endpoint.includes("?") ? "&" : "?";
  const authQuery = useCustomApi
    ? `${joiner}kkey=${encodeURIComponent(CUSTOM_API_KEY)}`
    : useQueryAuth
      ? `${joiner}consumer_key=${encodeURIComponent(AUTH_USER!)}&consumer_secret=${encodeURIComponent(AUTH_PASS!)}`
      : "";
  const namespace = useCustomApi ? "kafunda/v1" : "wc/v3";
  const url = `${urlBase}/wp-json/${namespace}/${endpoint}${authQuery}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(useCustomApi || useQueryAuth ? {} : { "Authorization": `Basic ${base64Auth}` }),
    // Browser-like UA: host WAFs (ModSecurity/Imunify/Wordfence) commonly
    // serve 403 block pages to requests with unrecognized user agents.
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    ...(ORIGIN_IP ? { "Host": HOSTNAME } : {}),
  };

  let result = await attemptWooREST(url, method, headers, body, opts);

  for (let i = 0; i < RETRY_DELAYS_MS.length && !result.ok && shouldRetry(result.status); i++) {
    await sleep(RETRY_DELAYS_MS[i]);
    console.warn(`[api] Retry ${i + 1}/${RETRY_DELAYS_MS.length} for ${endpoint} (last status ${result.status}).`);
    result = await attemptWooREST(url, method, headers, body, opts);
  }

  return result;
}

/**
 * Convenience wrapper: returns the parsed body on success, or null on any
 * failure. Callers MUST distinguish "null because it failed" from "empty
 * because there's nothing there" — see getAllProducts / getCategories.
 */
async function fetchWooREST(
  endpoint: string,
  method: string = "GET",
  body?: unknown,
  opts: { noStore?: boolean; tags?: string[] } = {}
) {
  const { ok, data } = await fetchWooRESTRaw(endpoint, method, body, opts);
  return ok ? data : null;
}

export interface WPCategory {
  id: string;
  name: string;
  slug: string;
  image: { sourceUrl: string } | null;
}

/**
 * Thrown when the catalogue genuinely cannot be reached after retries.
 * Callers (page components) should let this bubble so Next renders an
 * error boundary — serving an empty shop with HTTP 200 hides the outage
 * from both the customer and from monitoring.
 */
export class CatalogueUnavailableError extends Error {
  constructor(message = "The product catalogue is temporarily unavailable.") {
    super(message);
    this.name = "CatalogueUnavailableError";
  }
}

// --- Internal helper: map a raw Woo product node to our Product type ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(node: any): Product {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryNames = node.categories?.map((c: any) => decodeEntities(c.name)).join(", ") || "Uncategorized";
  const rawDescription = node.short_description || node.description || "";
  const cleanDescription = decodeEntities(rawDescription.replace(/<[^>]*>?/gm, "").trim()) || "No description available.";

  return {
    id: node.id.toString(),
    name: decodeEntities(node.name) || "Unknown Product",
    brand: "Kafunda Selection",
    category: categoryNames,
    price_ugx: Number(node.price || 0),
    original_price_ugx: node.regular_price && Number(node.regular_price) > Number(node.price) ? Number(node.regular_price) : null,
    image_url: node.images?.[0]?.src || "/product-placeholder.svg",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gallery_urls: node.images?.map((img: any) => img.src) || [],
    in_stock: node.stock_status === "instock",
    is_sale: node.on_sale,
    description: cleanDescription,
    abv: "N/A",
    volume: "750ml",
    stock_count: node.stock_quantity || 5,
  };
}

// 1. FETCH CATEGORIES
export async function getCategories(): Promise<WPCategory[]> {
  const { ok, data } = await fetchWooRESTRaw(
    "products/categories?hide_empty=true&per_page=100",
    "GET",
    undefined,
    { tags: ["categories"] }
  );

  if (!ok) {
    if (USE_FALLBACK) {
      console.warn("[api] WooCommerce unreachable — serving FALLBACK categories (dev only).");
      return getFallbackCategories();
    }
    // Categories failing is survivable (the shop can render without the
    // filter rail), so return empty rather than blowing up the page —
    // but log loudly so it shows up in Vercel error logs.
    console.error("[api] Categories fetch failed after retries — rendering without categories.");
    return [];
  }

  if (!Array.isArray(data)) return [];

  return data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => c.slug !== "uncategorized")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => ({
      id: c.id.toString(),
      name: decodeEntities(c.name),
      slug: c.slug,
      image: c.image ? { sourceUrl: c.image.src } : null
    }));
}

/**
 * 2. FETCH ALL PRODUCTS (paginated)
 * ----------------------------------------------------------------------
 * CHANGED: previously returned [] whenever the fetch failed, which is why
 * production served HTTP 200 pages with an empty shop during Cloudflare
 * drops. Now:
 *   - page 1 failing → THROW (the page shows an error, not a fake empty shop)
 *   - a LATER page failing → return what we have + log (partial catalogue
 *     beats no catalogue, and page 1 has already proved the origin is up)
 */
export async function getAllProducts(): Promise<Product[]> {
  let allRawProducts: unknown[] = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const { ok, data } = await fetchWooRESTRaw(`products?status=publish&per_page=100&page=${page}`);

    if (!ok) {
      if (page === 1) {
        if (USE_FALLBACK) {
          console.warn("[api] WooCommerce unreachable — serving FALLBACK catalogue (dev only).");
          return getFallbackProducts();
        }
        throw new CatalogueUnavailableError();
      }
      // Partial success: keep what we fetched instead of failing the page.
      console.error(`[api] Products page ${page} failed after retries — returning ${allRawProducts.length} products.`);
      break;
    }

    if (!Array.isArray(data) || data.length === 0) {
      hasMorePages = false;
      break;
    }

    allRawProducts = [...allRawProducts, ...data];

    if (data.length === 100) {
      page++;
    } else {
      hasMorePages = false;
    }
  }

  // A genuinely empty published catalogue is possible but should never
  // happen here — treat it as a failure rather than rendering an empty shop.
  if (allRawProducts.length === 0) {
    if (USE_FALLBACK) return getFallbackProducts();
    throw new CatalogueUnavailableError("The catalogue returned no products.");
  }

  return allRawProducts.map(mapProduct);
}

// 3a. PREVIEW SET (smaller, avoids full pagination)
// Used on the homepage. A failure here degrades gracefully (the section
// just doesn't render) rather than taking down the whole landing page.
export async function getProductsPreview(limit: number = 8): Promise<Product[]> {
  const { ok, data } = await fetchWooRESTRaw(`products?status=publish&per_page=${limit}&page=1`);
  if (!ok) {
    if (USE_FALLBACK) return getFallbackProducts().slice(0, limit);
    console.error("[api] Product preview fetch failed after retries — section will render empty.");
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.map(mapProduct);
}

/**
 * 3. SINGLE PRODUCT BY ID OR SLUG
 * ----------------------------------------------------------------------
 * CHANGED: now distinguishes "product doesn't exist" (404 → return null →
 * your notFound() path) from "we couldn't reach the catalogue" (transport
 * failure → THROW). Previously both returned null, so a Cloudflare drop
 * showed customers a 404 for a product that exists — actively misleading.
 *
 * Also uses the `products?include=` query form rather than `products/{id}`,
 * which the WAF has been observed blocking.
 */
export async function getProductBySlug(idOrSlug: string): Promise<Product | null> {
  const isNumericId = /^\d+$/.test(idOrSlug);

  const endpoint = isNumericId
    ? `products?include=${idOrSlug}&per_page=1`
    : `products?slug=${idOrSlug}`;

  const { ok, status, data } = await fetchWooRESTRaw(endpoint);

  if (!ok) {
    // 404 / 400 from Woo means the product genuinely isn't there.
    if (status >= 400 && status < 500) return null;
    // Transport failure or 5xx after retries — don't lie and say "not found".
    throw new CatalogueUnavailableError();
  }

  const node = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!node) return null;

  return mapProduct(node);
}

/**
 * 3b. BATCH PRODUCTS BY ID (checkout-grade)
 * ------------------------------------------------------------------
 * Verifies a set of cart products in a SINGLE request, using the same
 * `products?include=...` query shape the catalogue already uses
 * successfully -- deliberately avoiding the `products/{id}` path form,
 * which is what Cloudflare's WAF was blocking and causing the bogus
 * "Product X no longer available" errors at checkout.
 *
 * - Cache is disabled (no-store): checkout must always read live data.
 * - THROWS on a real transport / HTTP failure, so the caller can show
 *   "please try again" instead of falsely claiming a product is gone.
 * - Retries are now handled inside fetchWooRESTRaw (2 retries, jittered),
 *   so the ad-hoc single retry that used to live here is gone.
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = Array.from(new Set(ids.map((i) => String(i).trim()).filter(Boolean)));
  if (unique.length === 0) return [];

  const endpoint = `products?include=${unique.join(",")}&per_page=100`;

  const { ok, status, data } = await fetchWooRESTRaw(endpoint, "GET", undefined, { noStore: true });

  if (!ok) {
    throw new Error(`Catalogue fetch failed (HTTP ${status}).`);
  }
  if (!Array.isArray(data)) {
    throw new Error("Catalogue returned an unexpected response.");
  }

  return data.map(mapProduct);
}

// 4. SECURE CHECKOUT PROCESSING (Cash on Delivery)
export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

/** Shape of the WooCommerce order we read back after creation. */
export interface WooOrderResponse {
  id: number;
  status?: string;
  number?: string;
  total?: string;
  [key: string]: unknown;
}

/**
 * NOTE ON RETRIES AND ORDER CREATION: fetchWooRESTRaw only retries on
 * transport failures and 5xx. A transport failure on a POST /orders could
 * in principle mean the order WAS created and the response was lost — i.e.
 * a retry could duplicate it. This is an accepted, low-probability trade
 * for COD (duplicates are visible in wp-admin and easy to void). The
 * Pesapal path is protected separately by its idempotency key.
 */
export async function createOrder(
  customerData: CheckoutFormData,
  cartItems: CartItem[],
  deliveryFee: number = 0
): Promise<WooOrderResponse> {
  const orderData = {
    payment_method: "cod",
    payment_method_title: "Cash on Delivery",
    set_paid: false,
    status: "processing", // confirmed, awaiting delivery
    billing: {
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      address_1: customerData.address,
      city: customerData.city,
      country: "UG",
      email: customerData.email || "",
      phone: customerData.phone,
    },
    shipping: {
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      address_1: customerData.address,
      city: customerData.city,
      country: "UG",
    },
    line_items: cartItems.map(item => ({
      product_id: parseInt(item.product.id, 10),
      quantity: item.quantity,
    })),
    fee_lines: deliveryFee > 0
      ? [{ name: "Delivery Fee", total: deliveryFee.toString() }]
      : [],
    customer_note: customerData.notes || "",
  };

  const data = await fetchWooREST("orders", "POST", orderData, { noStore: true });

  if (!data || (data as { code?: string }).code) {
    throw new Error((data as { message?: string })?.message || "Failed to process checkout. Ensure items are in stock.");
  }

  return data as WooOrderResponse;
}