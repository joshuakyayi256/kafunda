/**
 * /api/checkout/pesapal — Pesapal Payment Initialization
 * ────────────────────────────────────────────────────────
 * Server-side only. Trusts NO pricing data from the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/api";
import { DELIVERY_ZONES } from "@/lib/constants";

// ── Constants ──────────────────────────────────────────────────────────────────

const PESAPAL_BASE = "https://pay.pesapal.com/v3";
const FREE_DELIVERY_THRESHOLD = 500_000;
const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000; // 1 hour

const WC_HOSTNAME = (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com")
  .replace(/\/graphql\/?$/, "")
  .replace(/^https?:\/\//, "");
const ORIGIN_IP = process.env.WP_ORIGIN_IP;
const WC_BASE   = ORIGIN_IP ? `http://${ORIGIN_IP}` : `https://${WC_HOSTNAME}`;
const WC_HEADERS: Record<string, string> = ORIGIN_IP ? { Host: WC_HOSTNAME } : {};
const BASE_URL  = process.env.NEXT_PUBLIC_BASE_URL || "https://kafundawines.com";

// ── Types ──────────────────────────────────────────────────────────────────────

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
  deliveryZone: string;
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

// ── In-memory caches ───────────────────────────────────────────────────────────
const idempotencyCache = new Map<string, IdempotencyEntry>();
let cachedIpnId: string | null = null;

function purgeExpiredIdempotency() {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.createdAt > IDEMPOTENCY_TTL_MS) idempotencyCache.delete(key);
  }
}

// ── Error class for user-facing validation issues ─────────────────────────────

class CheckoutError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = "CheckoutError";
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  if (!customer.deliveryZone?.trim()) throw new CheckoutError("Delivery zone required.");
}

/** Re-fetch each cart item from WooCommerce and compute trusted totals. */
async function verifyCartAndPrice(
  cart: IncomingCartItem[]
): Promise<{ lines: VerifiedLine[]; subtotal: number }> {
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    throw new CheckoutError("Cart is empty.");
  }
  if (cart.length > 100) {
    throw new CheckoutError("Cart too large.");
  }

  const lines: VerifiedLine[] = [];
  let subtotal = 0;

  for (const item of cart) {
    if (!item.id) throw new CheckoutError("Invalid cart line: missing product id.");

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new CheckoutError(`Invalid quantity for product ${item.id}.`);
    }

    const product = await getProductBySlug(item.id);
    if (!product) throw new CheckoutError(`Product ${item.id} no longer available.`);
    if (!product.in_stock) throw new CheckoutError(`"${product.name}" is out of stock.`);
    if (product.price_ugx <= 0) throw new CheckoutError(`"${product.name}" has invalid pricing.`);

    const lineTotal = product.price_ugx * quantity;
    subtotal += lineTotal;

    lines.push({
      id: item.id,
      name: product.name,
      unitPrice: product.price_ugx,
      quantity,
      lineTotal,
    });
  }

  return { lines, subtotal };
}

function resolveDeliveryFee(zoneId: string, subtotal: number): number {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId);
  if (!zone) throw new CheckoutError("Invalid delivery zone.");
  return zone.fee;
}

async function createWooOrder(
  customer: IncomingCustomer,
  lines: VerifiedLine[],
  deliveryFee: number,
  idempotencyKey: string | undefined
): Promise<number> {
  const wcKey = process.env.WC_CONSUMER_KEY;
  const wcSecret = process.env.WC_CONSUMER_SECRET;
  if (!wcKey || !wcSecret) throw new Error("Missing WooCommerce credentials.");

  const orderBody = {
    payment_method: "pesapal",
    payment_method_title: "Pesapal (Mobile Money / Card)",
    set_paid: false,
    status: "pending",
    billing: {
      first_name: customer.firstName,
      last_name: customer.lastName,
      address_1: customer.address,
      city: customer.deliveryZone,
      country: "UG",
      email: customer.email,
      phone: customer.phone,
    },
    shipping: {
      first_name: customer.firstName,
      last_name: customer.lastName,
      address_1: customer.address,
      city: customer.deliveryZone,
      country: "UG",
    },
    line_items: lines.map((l) => ({
      product_id: parseInt(l.id, 10),
      quantity: l.quantity,
    })),
    fee_lines: deliveryFee > 0
      ? [{ name: "Delivery Fee", total: deliveryFee.toString() }]
      : [],
    customer_note: customer.notes || "",
    meta_data: idempotencyKey
      ? [{ key: "_kafunda_idempotency_key", value: idempotencyKey }]
      : [],
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

// ── Route Handler ──────────────────────────────────────────────────────────────

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
      console.log(`[Pesapal] Idempotent replay key=${idempotencyKey} → order ${existing.wcOrderId}`);
      return NextResponse.json({
        success: true,
        redirect_url: existing.redirectUrl,
        order_tracking_id: existing.trackingId,
        merchant_reference: existing.merchantRef,
        wc_order_id: existing.wcOrderId,
        replayed: true,
      });
    }

    // 3. Server-side cart + price verification
    const { lines, subtotal } = await verifyCartAndPrice(payload.cart);

    // 4. Server-side delivery fee
    const deliveryFee = resolveDeliveryFee(payload.customer.deliveryZone, subtotal);

    // 5. Trusted total
    const total = subtotal + deliveryFee;

    // 6. Pesapal token + cached IPN id
    const token = await getPesapalToken();
    const notificationId = await getOrRegisterIpnId(token);

    // 7. Create pending Woo order with verified prices
    const wcOrderId = await createWooOrder(payload.customer, lines, deliveryFee, idempotencyKey);
    const merchantRef = `KAF-${wcOrderId}`;

    // 8. Submit to Pesapal with the trusted amount
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
        city: payload.customer.deliveryZone,
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

    // 9. Cache for idempotency
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