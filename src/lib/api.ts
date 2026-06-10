// src/lib/api.ts
import { Product } from "@/types";
import { decodeEntities } from "@/lib/utils";

const RAW_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com";
const BASE_URL = RAW_URL.replace(/\/graphql\/?$/, "");
const HOSTNAME  = new URL(BASE_URL).hostname;

const ORIGIN_IP = process.env.WP_ORIGIN_IP;
const AUTH_USER = process.env.WC_CONSUMER_KEY || process.env.WP_APP_USER;
const AUTH_PASS = process.env.WC_CONSUMER_SECRET || process.env.WP_APP_PASS;

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
  opts: { noStore?: boolean } = {}
): Promise<RawResult> {
  if (!AUTH_USER || !AUTH_PASS) {
    throw new Error(
      "Authentication credentials not found. " +
      "Please set WC_CONSUMER_KEY and WC_CONSUMER_SECRET in Vercel."
    );
  }

  const base64Auth = Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString("base64");
  const urlBase = ORIGIN_IP ? `http://${ORIGIN_IP}` : BASE_URL;
  const url = `${urlBase}/wp-json/wc/v3/${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Basic ${base64Auth}`,
    "User-Agent": "KafundaVercelBuild/1.0",
    ...(ORIGIN_IP ? { "Host": HOSTNAME } : {}),
  };

  try {
    const res = await fetch(url, {
      method,
      headers,
      ...(opts.noStore ? { cache: "no-store" } : { next: { revalidate: 60 } }),
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
      console.error(
        `WooCommerce API Error (HTTP ${res.status}) on endpoint: ${endpoint}`,
        text.slice(0, 200)
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
  opts: { noStore?: boolean } = {}
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
    image_url: node.images?.[0]?.src || "/don julio.webp",
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
  const data = await fetchWooREST("products/categories?hide_empty=true&per_page=100");
  if (!data || !Array.isArray(data)) return [];

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

  const { ok, status, data } = await fetchWooRESTRaw(
    `products?include=${unique.join(",")}&per_page=100`,
    "GET",
    undefined,
    { noStore: true }
  );

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