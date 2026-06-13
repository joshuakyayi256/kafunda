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
 * Low-level WooCommerce REST call that ALWAYS reports what happened.
 * Returns { ok, status, data } so callers can tell the difference between
 * "the request failed" and "the request succeeded but returned nothing".
 *
 * By default responses are cached for 60s (good for the catalogue). Pass
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

  try {
    const res = await fetch(url, {
      method,
      headers,
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
      // While the dev fallback is active, log as a warning so Next's dev
      // error overlay stays quiet; in production this stays a real error.
      const log = USE_FALLBACK ? console.warn : console.error;
      log(
        `WooCommerce API Error (HTTP ${res.status}) on endpoint: ${endpoint}`,
        text.slice(0, 600)
      );
    }

    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error("WooCommerce Fetch Error:", error);
    return { ok: false, status: 0, data: null };
  }
}

/**
 * Convenience wrapper that preserves the old behaviour: returns the parsed
 * body on success, or null on any failure. Used by the catalogue / category
 * calls where a graceful empty fallback is fine.
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
  const data = await fetchWooREST("products/categories?hide_empty=true&per_page=100", "GET", undefined, { tags: ["categories"] });
  if (!data || !Array.isArray(data)) {
    if (USE_FALLBACK) {
      console.warn("[api] WooCommerce unreachable — serving FALLBACK categories (dev only).");
      return getFallbackCategories();
    }
    return [];
  }

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

// 2. FETCH ALL PRODUCTS (Paginated for 500+ products)
export async function getAllProducts(): Promise<Product[]> {
  let allRawProducts: unknown[] = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const data = await fetchWooREST(`products?status=publish&per_page=100&page=${page}`);

    if (!data || !Array.isArray(data) || data.length === 0) {
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

  if (allRawProducts.length === 0 && USE_FALLBACK) {
    console.warn("[api] WooCommerce unreachable — serving FALLBACK catalogue (dev only).");
    return getFallbackProducts();
  }

  return allRawProducts.map(mapProduct);
}

// 3a. PREVIEW SET (smaller, avoids full pagination)
export async function getProductsPreview(limit: number = 8): Promise<Product[]> {
  const data = await fetchWooREST(`products?status=publish&per_page=${limit}&page=1`);
  if (!data || !Array.isArray(data)) return [];
  return data.map(mapProduct);
}

// 3. SINGLE PRODUCT BY ID OR SLUG
export async function getProductBySlug(idOrSlug: string): Promise<Product | null> {
  const isNumericId = /^\d+$/.test(idOrSlug);

  const data = isNumericId
    ? await fetchWooREST(`products/${idOrSlug}`)
    : await fetchWooREST(`products?slug=${idOrSlug}`);

  if (!data) return null;

  const node = isNumericId ? data : (Array.isArray(data) && data.length > 0 ? data[0] : null);
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
 * - Returns only the products WooCommerce actually has; a genuinely
 *   missing id simply won't be in the result, and the caller decides
 *   how to report that.
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = Array.from(new Set(ids.map((i) => String(i).trim()).filter(Boolean)));
  if (unique.length === 0) return [];

  const endpoint = `products?include=${unique.join(",")}&per_page=100`;

  // One automatic retry with a short backoff: papers over one-off network
  // blips at the moment of payment without weakening live verification.
  let result = await fetchWooRESTRaw(endpoint, "GET", undefined, { noStore: true });
  if (!result.ok) {
    await new Promise((r) => setTimeout(r, 700));
    result = await fetchWooRESTRaw(endpoint, "GET", undefined, { noStore: true });
  }

  const { ok, status, data } = result;

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