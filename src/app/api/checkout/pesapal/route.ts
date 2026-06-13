/**
 * /api/checkout/pesapal - Pesapal Payment Initialization
 * --------------------------------------------------------
 * Server-side only. Trusts NO pricing data from the client.
 * Delivery: if the customer pinned a location, the fee is recomputed HERE
 * from the coordinates (src/lib/delivery.ts) and charged with the order.
 * If there's no pin (or the quote engine can't price it), the fee falls
 * back to being quoted per location on the confirmation call, so the
 * amount sent to Pesapal is the goods subtotal only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/api";
import { PESAPAL_SURCHARGE_RATE } from "@/lib/constants";
import { getDeliveryQuote, isInUganda, type DeliveryQuote } from "@/lib/delivery";

// -- Constants --------------------------------------------------------------

const PESAPAL_BASE = "https://pay.pesapal.com/v3";
const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000; // 1 hour

const WC_HOSTNAME = (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com")
  .replace(/\/graphql\/?$/, "")
  .replace(/^https?:\/\//, "");
const ORIGIN_IP = process.env.WP_ORIGIN_IP;
const WC_BASE   = ORIGIN_IP ? `http://${ORIGIN_IP}` : `https://${WC_HOSTNAME}`;
const WC_HEADERS: Record<string, string> = ORIGIN_IP ? { Host: WC_HOSTNAME } : {};
const BASE_URL  = process.env.NEXT_PUBLIC_BASE_URL || "https://kafundawines.com";

// -- Types ------------------------------------------------------------------

interface IncomingCartItem {
  id: string;
  quantity: number;
}

interface IncomingCustomer {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  /** Pinned delivery coordinates from the checkout map (optional). */
  location?: { lat: number; lng: number } | null;
  /** Reverse-geocoded label for the pin (rider context / Woo city). */
  locationLabel?: string;
  notes?: string;
}

interface CheckoutPayload {
  customer: IncomingCustomer;
  cart: IncomingCartItem[];
  idempotencyKey?: string;
}

interface VerifiedLine {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

interface IdempotencyEntry {
  wcOrderId: number;
  redirectUrl: string;
  trackingId: string;
  merchantRef: string;
  createdAt: number;
}

/** Subset of Pesapal's SubmitOrderRequest response we actually use. */
interface PesapalSubmitResponse {
  redirect_url?: string;
  order_tracking_id?: string;
  merchant_reference?: string;
  message?: string;
  status?: string;
  error?: { message?: string; code?: string; error_type?: string };
}

// -- In-memory caches -------------------------------------------------------
const idempotencyCache = new Map<string, IdempotencyEntry>();
let cachedIpnId: string | null = null;

function purgeExpiredIdempotency() {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.createdAt > IDEMPOTENCY_TTL_MS) idempotencyCache.delete(key);
  }
}

// -- Error class for user-facing validation issues -------------------------

class CheckoutError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = "CheckoutError";
  }
}

// -- Helpers ----------------------------------------------------------------

async function getPesapalToken(): Promise<string> {
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("Missing Pesapal credentials.");

  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("[Pesapal] Token request non-OK:", res.status, text.slice(0, 1500));
    throw new Error(`Pesapal token request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  let data: {
    token?: string;
    expiryDate?: string;
    error?: { message?: string; code?: string; error_type?: string };
    message?: string;
    status?: string;
  };
  try {
    data = JSON.parse(text);
  } catch {
    console.error("[Pesapal] Token response not JSON:", text.slice(0, 1500));
    throw new Error("Pesapal returned a non-JSON token response.");
  }

  if (!data.token) {
    const reason =
      data.message ||
      data.error?.message ||
      JSON.stringify(data).slice(0, 300);
    throw new Error(`Pesapal token refused: ${reason}`);
  }

  return data.token;
}

async function getOrRegisterIpnId(token: string): Promise<string> {
  // Prefer a pre-registered IPN id from the environment. Registering on every
  // cold start (the old behaviour) piles up duplicate IPN registrations on
  // Pesapal because serverless memory does not persist. Register once and set
  // PESAPAL_IPN_ID in Vercel.
  const fromEnv = process.env.PESAPAL_IPN_ID;
  if (fromEnv) return fromEnv;

  if (cachedIpnId) return cachedIpnId;

  const ipnUrl = `${BASE_URL}/api/checkout/pesapal/ipn`;
  const res = await fetch(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: "GET" }),
  });

  if (!res.ok) throw new Error(`Pesapal IPN registration failed (${res.status}).`);

  const data = await res.json();
  const id = (data.ipn_id || data.notification_id || "") as string;
  if (!id) throw new Error("Pesapal did not return an IPN id.");

  cachedIpnId = id;
  return id;
}

function validateCustomer(customer: IncomingCustomer): void {
  if (!customer) throw new CheckoutError("Customer details required.");
  if (!customer.firstName?.trim() || !customer.lastName?.trim()) {
    throw new CheckoutError("First and last name required.");
  }
  if (!customer.phone?.trim()) throw new CheckoutError("Phone number required.");

  const cleanPhone = customer.phone.replace(/\s/g, "");
  if (!/^(\+?256|0)?[7][0-9]{8}$/.test(cleanPhone)) {
    throw new CheckoutError("Invalid Ugandan phone number.");
  }
  if (!customer.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    throw new CheckoutError("Valid email required for order receipt.");
  }
  if (!customer.address?.trim()) throw new CheckoutError("Delivery address required.");

  // Location pin is optional, but if present it must be sane coordinates —
  // garbage here would feed the fee calculation.
  if (customer.location) {
    const { lat, lng } = customer.location;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInUganda(lat, lng)) {
      throw new CheckoutError("Invalid delivery location pin.");
    }
  }
}

/**
 * Re-fetch the whole cart from WooCommerce in ONE batched request and compute
 * trusted totals. Uses getProductsByIds (products?include=...) -- the same
 * query shape the catalogue uses -- which fixes the false "no longer
 * available" errors caused by the WAF blocking the per-id path form.
 */
async function verifyCartAndPrice(
  cart: IncomingCartItem[]
): Promise<{ lines: VerifiedLine[]; subtotal: number }> {
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    throw new CheckoutError("Cart is empty.");
  }
  if (cart.length > 100) {
    throw new CheckoutError("Cart too large.");
  }

  const wanted = cart.map((item) => {
    if (!item.id) throw new CheckoutError("Invalid cart line: missing product id.");
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new CheckoutError(`Invalid quantity for product ${item.id}.`);
    }
    return { id: String(item.id), quantity };
  });

  let products;
  try {
    products = await getProductsByIds(wanted.map((w) => w.id));
  } catch (err) {
    console.error("[Pesapal] Cart verification fetch failed:", err);
    throw new CheckoutError(
      "We could not reach the product catalogue just now. Please try again in a moment.",
      503
    );
  }

  const byId = new Map(products.map((p) => [String(p.id), p]));

  const lines: VerifiedLine[] = [];
  let subtotal = 0;

  for (const w of wanted) {
    const product = byId.get(w.id);
    if (!product) throw new CheckoutError(`A product in your cart (#${w.id}) is no longer available.`);
    if (!product.in_stock) throw new CheckoutError(`"${product.name}" is out of stock.`);
    if (product.price_ugx <= 0) throw new CheckoutError(`"${product.name}" has invalid pricing.`);

    const lineTotal = product.price_ugx * w.quantity;
    subtotal += lineTotal;

    lines.push({
      id: w.id,
      name: product.name,
      unitPrice: product.price_ugx,
      quantity: w.quantity,
      lineTotal,
    });
  }

  return { lines, subtotal };
}

/**
 * Quote the delivery fee from the pinned coordinates. AUTHORITATIVE — the
 * figure the client displayed is ignored. Returns null when the customer
 * didn't pin a location or the engine can't price it (out of range, Mapbox
 * down): in those cases NO fee is charged and the fare is settled on the
 * confirmation call, exactly like the previous flow.
 */
async function quoteDeliveryFee(
  customer: IncomingCustomer
): Promise<DeliveryQuote | null> {
  if (!customer.location) return null;
  try {
    const result = await getDeliveryQuote(customer.location.lat, customer.location.lng);
    if (result.ok) return result.quote;
    console.warn(`[Pesapal] Delivery quote fell back to call (${result.reason}).`);
    return null;
  } catch (err) {
    console.error("[Pesapal] Delivery quote error:", err);
    return null;
  }
}

/** City label for Woo / Pesapal: pin label > "Kampala". Woo caps city length. */
function cityLabel(customer: IncomingCustomer): string {
  const label = customer.locationLabel?.trim();
  return label ? label.slice(0, 90) : "Kampala";
}

async function createWooOrder(
  customer: IncomingCustomer,
  lines: VerifiedLine[],
  delivery: DeliveryQuote | null,
  surcharge: number,
  idempotencyKey: string | undefined
): Promise<number> {
  const wcKey = process.env.WC_CONSUMER_KEY || process.env.WP_APP_USER;
  const wcSecret = process.env.WC_CONSUMER_SECRET || process.env.WP_APP_PASS;
  if (!wcKey || !wcSecret) {
    const state = {
      WC_CONSUMER_KEY:    !!process.env.WC_CONSUMER_KEY,
      WC_CONSUMER_SECRET: !!process.env.WC_CONSUMER_SECRET,
      WP_APP_USER:        !!process.env.WP_APP_USER,
      WP_APP_PASS:        !!process.env.WP_APP_PASS,
    };
    console.error("[Pesapal] WC creds state:", state);
    throw new Error(`Missing WC creds. State: ${JSON.stringify(state)}`);
  }

  const feeLines: { name: string; total: string }[] = [];
  // Delivery fee (when auto-quoted from the pin) is recorded as a fee line so
  // the Woo order total exactly matches the amount charged via Pesapal. When
  // there's no quote, the fee is settled on the confirmation call instead.
  if (delivery) {
    feeLines.push({
      name: `Delivery (${delivery.distanceKm} km · ${delivery.storeName})`,
      total: delivery.feeUgx.toString(),
    });
  }
  if (surcharge > 0) {
    feeLines.push({ name: "Online payment charge (3.5%)", total: surcharge.toString() });
  }

  const metaData: { key: string; value: string }[] = [];
  if (idempotencyKey) {
    metaData.push({ key: "_kafunda_idempotency_key", value: idempotencyKey });
  }
  if (customer.location) {
    metaData.push({
      key: "_kafunda_delivery_pin",
      value: JSON.stringify({
        lat: customer.location.lat,
        lng: customer.location.lng,
        label: customer.locationLabel || "",
        distanceKm: delivery?.distanceKm ?? null,
        feeUgx: delivery?.feeUgx ?? null,
        store: delivery?.storeId ?? null,
        maps: `https://www.google.com/maps?q=${customer.location.lat},${customer.location.lng}`,
      }),
    });
  }

  const orderBody = {
    payment_method: "pesapal",
    payment_method_title: "Pesapal (Mobile Money / Card)",
    set_paid: false,
    status: "pending",
    billing: {
      first_name: customer.firstName,
      last_name: customer.lastName,
      address_1: customer.address,
      city: cityLabel(customer),
      country: "UG",
      email: customer.email,
      phone: customer.phone,
    },
    shipping: {
      first_name: customer.firstName,
      last_name: customer.lastName,
      address_1: customer.address,
      city: cityLabel(customer),
      country: "UG",
    },
    line_items: lines.map((l) => ({
      product_id: parseInt(l.id, 10),
      quantity: l.quantity,
    })),
    fee_lines: feeLines,
    customer_note: customer.notes || "",
    meta_data: metaData,
  };

  const base64Auth = Buffer.from(`${wcKey}:${wcSecret}`).toString("base64");
  const res = await fetch(`${WC_BASE}/wp-json/wc/v3/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${base64Auth}`,
      ...WC_HEADERS,
    },
    body: JSON.stringify(orderBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WooCommerce order creation failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data?.id) throw new Error("WooCommerce did not return an order id.");
  return data.id as number;
}

// -- Route Handler ----------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    purgeExpiredIdempotency();

    const payload = (await request.json()) as CheckoutPayload;

    // 1. Validate
    validateCustomer(payload.customer);

    // 2. Idempotency replay check
    const idempotencyKey = payload.idempotencyKey?.trim();
    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const existing = idempotencyCache.get(idempotencyKey)!;
      console.log(`[Pesapal] Idempotent replay key=${idempotencyKey} -> order ${existing.wcOrderId}`);
      return NextResponse.json({
        success: true,
        redirect_url: existing.redirectUrl,
        order_tracking_id: existing.trackingId,
        merchant_reference: existing.merchantRef,
        wc_order_id: existing.wcOrderId,
        replayed: true,
      });
    }

    // 3. Server-side cart + price verification (batched)
    const { lines, subtotal } = await verifyCartAndPrice(payload.cart);

    // 4. Server-side delivery quote from the pinned coordinates (null = fee
    //    settled on the confirmation call), then the trusted total:
    //    goods + delivery + 3.5% online processing charge on the amount that
    //    actually moves through Pesapal. Computed from verified prices —
    //    the client's figures are display-only. Whole UGX shillings.
    const delivery = await quoteDeliveryFee(payload.customer);
    const deliveryFee = delivery?.feeUgx ?? 0;
    const surcharge = Math.round((subtotal + deliveryFee) * PESAPAL_SURCHARGE_RATE);
    const total = subtotal + deliveryFee + surcharge;

    // 5. Pesapal token + IPN id
    const token = await getPesapalToken();
    const notificationId = await getOrRegisterIpnId(token);

    // 6. Create pending Woo order with verified prices (delivery + surcharge
    //    recorded as fee lines so the Woo order total matches the Pesapal charge)
    const wcOrderId = await createWooOrder(payload.customer, lines, delivery, surcharge, idempotencyKey);
    const merchantRef = `KAF-${wcOrderId}`;

    // 7. Submit to Pesapal with the trusted amount
    const submitBody = {
      id: merchantRef,
      currency: "UGX",
      amount: total,
      description: `Kafunda Wines Order ${merchantRef}`,
      callback_url: `${BASE_URL}/checkout/success?order=${merchantRef}`,
      notification_id: notificationId,
      branch: "Mpererwe Branch",
      billing_address: {
        email_address: payload.customer.email,
        phone_number: payload.customer.phone,
        country_code: "UG",
        first_name: payload.customer.firstName,
        last_name: payload.customer.lastName,
        line_1: payload.customer.address,
        city: cityLabel(payload.customer),
      },
    };

    const submitRes = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(submitBody),
    });

    const submitText = await submitRes.text();

    if (!submitRes.ok) {
      console.error("[Pesapal] SubmitOrderRequest non-OK:", submitRes.status, submitText.slice(0, 1500));
      throw new Error(`Pesapal SubmitOrderRequest failed (${submitRes.status}): ${submitText.slice(0, 200)}`);
    }

    let submitData: PesapalSubmitResponse;
    try {
      submitData = JSON.parse(submitText) as PesapalSubmitResponse;
    } catch {
      console.error("[Pesapal] Submit response not JSON:", submitText.slice(0, 1500));
      throw new Error("Pesapal returned a non-JSON response.");
    }

    if (!submitData.redirect_url) {
      const reason =
        submitData.message ||
        submitData.error?.message ||
        JSON.stringify(submitData).slice(0, 300);
      throw new Error(`Pesapal refused submission: ${reason}`);
    }

    // 8. Cache for idempotency
    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, {
        wcOrderId,
        redirectUrl: submitData.redirect_url,
        trackingId: submitData.order_tracking_id ?? "",
        merchantRef,
        createdAt: Date.now(),
      });
    }

    return NextResponse.json({
      success: true,
      redirect_url: submitData.redirect_url,
      order_tracking_id: submitData.order_tracking_id,
      merchant_reference: merchantRef,
      wc_order_id: wcOrderId,
      delivery_fee: deliveryFee,
    });
  } catch (err: unknown) {
    if (err instanceof CheckoutError) {
      console.warn("[Pesapal API] Validation:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown server error.";
    console.error("[Pesapal API] Error:", message);
    return NextResponse.json(
      { error: "Could not process payment. Please try again or contact support." },
      { status: 500 }
    );
  }
}