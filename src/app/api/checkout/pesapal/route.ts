/**
 * /api/checkout/pesapal — Pesapal Payment Initialization
 * ────────────────────────────────────────────────────────
 * Secure server-side route. Never runs in the browser.
 *
 * Flow:
 *  1. Receive order payload from the checkout page.
 *  2. Obtain a short-lived OAuth 2.0 token from Pesapal.
 *  3. Register our IPN URL with Pesapal (idempotent — tracks notification_id).
 *  4. Create a pending WooCommerce order so the store has a record immediately.
 *  5. Submit the SubmitOrderRequest to Pesapal.
 *  6. Return the Pesapal redirect_url to the browser.
 */

import { NextRequest, NextResponse } from "next/server";

// ── Constants ──────────────────────────────────────────────────────────────────

const PESAPAL_BASE = "https://pay.pesapal.com/v3";
const WC_BASE =
  (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com").replace(
    /\/graphql\/?$/,
    ""
  );
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://kafundawines.com";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CartItemPayload {
  id: string;
  name: string;
  price_ugx: number;
  quantity: number;
}

interface CheckoutPayload {
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    deliveryZone: string;
    notes?: string;
  };
  cart: CartItemPayload[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Fetch a fresh Pesapal OAuth token (valid for ~5 minutes). */
async function getPesapalToken(): Promise<string> {
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;

  if (!key || !secret) {
    throw new Error("Missing PESAPAL_CONSUMER_KEY or PESAPAL_CONSUMER_SECRET env vars.");
  }

  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pesapal token request failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (!data.token) throw new Error("Pesapal did not return a token.");
  return data.token as string;
}

/** Register our IPN endpoint with Pesapal and return the notification_id. */
async function registerIPN(token: string): Promise<string> {
  const ipnUrl = `${BASE_URL}/api/checkout/pesapal/ipn`;

  const res = await fetch(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: "GET",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pesapal IPN registration failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  // Pesapal returns ipn_id on first registration, or the existing id on duplicates
  return (data.ipn_id || data.notification_id || "") as string;
}

/** Create a pending WooCommerce order and return its numeric ID. */
async function createWooOrder(payload: CheckoutPayload): Promise<number> {
  const wcKey = process.env.WC_CONSUMER_KEY;
  const wcSecret = process.env.WC_CONSUMER_SECRET;

  if (!wcKey || !wcSecret) {
    throw new Error("Missing WC_CONSUMER_KEY or WC_CONSUMER_SECRET env vars.");
  }

  const orderBody = {
    payment_method: "pesapal",
    payment_method_title: "Pesapal (Mobile Money / Card)",
    set_paid: false,
    status: "pending",
    billing: {
      first_name: payload.customer.firstName,
      last_name: payload.customer.lastName,
      address_1: payload.customer.address,
      city: payload.customer.deliveryZone,
      country: "UG",
      email: payload.customer.email || "",
      phone: payload.customer.phone,
    },
    shipping: {
      first_name: payload.customer.firstName,
      last_name: payload.customer.lastName,
      address_1: payload.customer.address,
      city: payload.customer.deliveryZone,
      country: "UG",
    },
    line_items: payload.cart.map((item) => ({
      product_id: parseInt(item.id, 10),
      quantity: item.quantity,
    })),
    fee_lines: payload.deliveryFee > 0
      ? [{ name: "Delivery Fee", total: payload.deliveryFee.toString() }]
      : [],
    customer_note: payload.customer.notes || "",
  };

  const base64Auth = Buffer.from(`${wcKey}:${wcSecret}`).toString("base64");
  const url = `${WC_BASE}/wp-json/wc/v3/orders`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${base64Auth}`,
    },
    body: JSON.stringify(orderBody),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WooCommerce order creation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.id as number;
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const payload: CheckoutPayload = await request.json();

    // Basic validation
    if (!payload.customer?.phone || !payload.cart?.length) {
      return NextResponse.json(
        { error: "Invalid payload: customer phone and cart items are required." },
        { status: 400 }
      );
    }

    // Step 1: Get Pesapal token
    const token = await getPesapalToken();

    // Step 2: Register IPN URL (idempotent)
    const notificationId = await registerIPN(token);

    // Step 3: Create a pending WooCommerce order for immediate reconciliation
    const wcOrderId = await createWooOrder(payload);
    const merchantRef = `KAF-${wcOrderId}`;

    // Step 4: Submit order to Pesapal
    const submitBody = {
      id: merchantRef,
      currency: "UGX",
      amount: payload.total,
      description: `Kafunda Wines Order ${merchantRef}`,
      callback_url: `${BASE_URL}/checkout/success?order=${merchantRef}`,
      notification_id: notificationId,
      branch: "Kafunda Wines & Spirits — Mpererwe",
      billing_address: {
        email_address: payload.customer.email || "",
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

    if (!submitRes.ok) {
      const err = await submitRes.text();
      throw new Error(`Pesapal SubmitOrderRequest failed (${submitRes.status}): ${err}`);
    }

    const submitData = await submitRes.json();

    if (!submitData.redirect_url) {
      throw new Error("Pesapal did not return a redirect_url.");
    }

    return NextResponse.json({
      success: true,
      redirect_url: submitData.redirect_url,
      order_tracking_id: submitData.order_tracking_id,
      merchant_reference: merchantRef,
      wc_order_id: wcOrderId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown server error.";
    console.error("[Pesapal API] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
