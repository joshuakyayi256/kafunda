/**
 * Minimal server-side Pesapal status lookup for background jobs (stale-order
 * cleanup). The checkout/IPN routes keep their own copies for now.
 */

const PESAPAL_BASE = "https://pay.pesapal.com/v3";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;

  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("Missing Pesapal credentials.");

  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Pesapal token request failed (${res.status}).`);
  const data = (await res.json()) as { token?: string; expiryDate?: string };
  if (!data.token) throw new Error("Pesapal auth: no token.");

  cachedToken = {
    token: data.token,
    expiresAt: data.expiryDate ? new Date(data.expiryDate).getTime() : Date.now() + 4 * 60_000,
  };
  return data.token;
}

/** Returns Pesapal's payment_status_description (COMPLETED / FAILED / INVALID / REVERSED / …). */
export async function getPesapalPaymentStatus(trackingId: string): Promise<string> {
  const token = await getToken();
  const res = await fetch(
    `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
    { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Pesapal status check failed (${res.status}).`);
  const txn = (await res.json()) as { payment_status_description?: string };
  return String(txn.payment_status_description || "PENDING").toUpperCase();
}
