/**
 * /api/checkout/cod - Cash on Delivery order creation
 * ----------------------------------------------------
 * NEW (June 2026). The old flow called createOrder() from lib/api.ts inside
 * the client-side checkout page — but WC_CONSUMER_KEY/SECRET are server-only
 * env vars (undefined in the browser bundle), so COD orders failed with
 * "Authentication credentials not found", and fixing it client-side would
 * have meant shipping Woo keys to the browser. This route keeps credentials
 * server-side, verifies the cart with the same batched lookup as the Pesapal
 * route, and records the distance-quoted delivery fee as a fee line.
 *
 * No payment surcharge here — COD never carries the 3.5% online charge.
 * Goods + delivery fee are paid in cash on arrival.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/api";
import { getDeliveryQuote, isInUganda, type DeliveryQuote } from "@/lib/delivery";

// -- Constants --------------------------------------------------------------

const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000; // 1 hour

const WC_HOSTNAME = (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com")
  .replace(/\/graphql\/?$/, "")
  .replace(/^https?:\/\//, "");
const ORIGIN_IP = process.env.WP_ORIGIN_IP;
const WC_BASE   = ORIGIN_IP ? `http://${ORIGIN_IP}` : `https://${WC_HOSTNAME}`;
const WC_HEADERS: Record<string, string> = ORIGIN_IP ? { Host: WC_HOSTNAME } : {};

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
  location?: { lat: number; lng: number } | null;
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
  deliveryFee: number;
  createdAt: number;
}

// -- In-memory idempotency (same interim pattern as the Pesapal route) ------
const idempotencyCache = new Map<string, IdempotencyEntry>();

function purgeExpiredIdempotency() {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.createdAt > IDEMPOTENCY_TTL_MS) idempotencyCache.delete(key);
  }
}

class CheckoutError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = "CheckoutError";
  }
}

// -- Validation / verification (mirrors the Pesapal route) -------------------

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

  if (customer.location) {
    const { lat, lng } = customer.location;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInUganda(lat, lng)) {
      throw new CheckoutError("Invalid delivery location pin.");
    }
  }
}

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
    console.error("[COD] Cart verification fetch failed:", err);
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

function cityLabel(customer: IncomingCustomer): string {
  const label = customer.locationLabel?.trim();
  return label ? label.slice(0, 90) : "Kampala";
}

// -- Route Handler ----------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    purgeExpiredIdempotency();

    const payload = (await request.json()) as CheckoutPayload;

    // 1. Validate
    validateCustomer(payload.customer);

    // 2. Idempotency replay check (double-tap on "Place Order")
    const idempotencyKey = payload.idempotencyKey?.trim();
    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const existing = idempotencyCache.get(idempotencyKey)!;
      console.log(`[COD] Idempotent replay key=${idempotencyKey} -> order ${existing.wcOrderId}`);
      return NextResponse.json({
        success: true,
        wc_order_id: existing.wcOrderId,
        order_number: `KAF-${existing.wcOrderId}`,
        delivery_fee: existing.deliveryFee,
        replayed: true,
      });
    }

    // 3. Server-side cart + price verification (batched)
    const { lines } = await verifyCartAndPrice(payload.cart);

    // 4. Server-side delivery quote (null = fee settled on the call)
    let delivery: DeliveryQuote | null = null;
    if (payload.customer.location) {
      const result = await getDeliveryQuote(
        payload.customer.location.lat,
        payload.customer.location.lng
      );
      if (result.ok) delivery = result.quote;
      else console.warn(`[COD] Delivery quote fell back to call (${result.reason}).`);
    }

    // 5. Create the Woo order
    const wcKey = process.env.WC_CONSUMER_KEY || process.env.WP_APP_USER;
    const wcSecret = process.env.WC_CONSUMER_SECRET || process.env.WP_APP_PASS;
    if (!wcKey || !wcSecret) throw new Error("Missing WC credentials on the server.");

    const metaData: { key: string; value: string }[] = [];
    if (idempotencyKey) {
      metaData.push({ key: "_kafunda_idempotency_key", value: idempotencyKey });
    }
    if (payload.customer.location) {
      metaData.push({
        key: "_kafunda_delivery_pin",
        value: JSON.stringify({
          lat: payload.customer.location.lat,
          lng: payload.customer.location.lng,
          label: payload.customer.locationLabel || "",
          distanceKm: delivery?.distanceKm ?? null,
          feeUgx: delivery?.feeUgx ?? null,
          store: delivery?.storeId ?? null,
          maps: `https://www.google.com/maps?q=${payload.customer.location.lat},${payload.customer.location.lng}`,
        }),
      });
    }

    const orderBody = {
      payment_method: "cod",
      payment_method_title: "Cash on Delivery",
      set_paid: false,
      status: "processing", // confirmed, awaiting delivery
      billing: {
        first_name: payload.customer.firstName,
        last_name: payload.customer.lastName,
        address_1: payload.customer.address,
        city: cityLabel(payload.customer),
        country: "UG",
        email: payload.customer.email,
        phone: payload.customer.phone,
      },
      shipping: {
        first_name: payload.customer.firstName,
        last_name: payload.customer.lastName,
        address_1: payload.customer.address,
        city: cityLabel(payload.customer),
        country: "UG",
      },
      line_items: lines.map((l) => ({
        product_id: parseInt(l.id, 10),
        quantity: l.quantity,
      })),
      // Delivery fee (when auto-quoted from the pin) recorded as a fee line —
      // paid in cash on arrival together with the goods. No quote = fee
      // settled on the confirmation call, like before.
      fee_lines: delivery
        ? [{
            name: `Delivery (${delivery.distanceKm} km · ${delivery.storeName}) — cash on arrival`,
            total: delivery.feeUgx.toString(),
          }]
        : [],
      customer_note: payload.customer.notes || "",
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
      console.error(`[COD] WooCommerce order creation failed (${res.status}):`, text.slice(0, 300));
      throw new Error("Order could not be created.");
    }

    const data = await res.json();
    if (!data?.id) throw new Error("WooCommerce did not return an order id.");
    const wcOrderId = data.id as number;
    const deliveryFee = delivery?.feeUgx ?? 0;

    // 6. Cache for idempotency
    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, {
        wcOrderId,
        deliveryFee,
        createdAt: Date.now(),
      });
    }

    return NextResponse.json({
      success: true,
      wc_order_id: wcOrderId,
      order_number: `KAF-${wcOrderId}`,
      delivery_fee: deliveryFee,
    });
  } catch (err: unknown) {
    if (err instanceof CheckoutError) {
      console.warn("[COD API] Validation:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown server error.";
    console.error("[COD API] Error:", message);
    return NextResponse.json(
      { error: "Order could not be created. Please try again or contact support." },
      { status: 500 }
    );
  }
}