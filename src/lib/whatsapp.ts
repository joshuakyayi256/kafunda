// src/lib/whatsapp.ts
/**
 * WhatsApp Cloud API notifier (server-only)
 * ------------------------------------------------------------------
 * Sends a one-line "new order" alert to Deborah so she can call the
 * customer and quote the delivery fare.
 *
 * Design rules:
 *  - NEVER throws. A WhatsApp failure must never break or roll back an
 *    order. Every call is wrapped and any error is only logged.
 *  - No-op until configured. If the env vars are absent (e.g. before the
 *    template is approved) it silently does nothing, so this file is safe
 *    to ship before the Meta setup is finished.
 *  - Uses an approved Utility template, required for business-initiated
 *    messages outside the 24-hour window.
 *
 * Required env vars (set in Vercel once your Meta setup is live):
 *   WHATSAPP_PHONE_NUMBER_ID   - the Phone Number ID from WhatsApp Manager
 *   WHATSAPP_ACCESS_TOKEN      - permanent System User token
 *   WHATSAPP_TEMPLATE_NAME     - e.g. "new_order_alert"
 *   WHATSAPP_TEMPLATE_LANG     - e.g. "en" (defaults to "en")
 *   ORDER_ALERT_RECIPIENT      - Deborah's number in E.164 digits, e.g. 256785498279
 */

const GRAPH_VERSION = "v22.0";

interface NewOrderAlert {
  orderRef: string;      // e.g. KAF-1042
  customerName: string;  // first + last
  phone: string;         // customer's phone
  zone: string;          // delivery zone label
  total: string;         // formatted total, e.g. "UGX 162,000"
}

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || "en";
  const recipient = process.env.ORDER_ALERT_RECIPIENT;

  if (!phoneNumberId || !token || !templateName || !recipient) return null;
  return { phoneNumberId, token, templateName, lang, recipient };
}

/** Normalise a Ugandan number to E.164 digits Meta expects (256XXXXXXXXX). */
function toE164(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("256")) return digits;
  if (digits.startsWith("0")) return `256${digits.slice(1)}`;
  if (digits.startsWith("7")) return `256${digits}`;
  return digits;
}

/**
 * Fire the new-order alert. Always resolves; never rejects.
 * Returns true if a message was sent, false if skipped or failed.
 */
export async function notifyNewOrder(alert: NewOrderAlert): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    // Not configured yet (e.g. template still pending approval). Skip quietly.
    return false;
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${config.phoneNumberId}/messages`;

    const body = {
      messaging_product: "whatsapp",
      to: toE164(config.recipient),
      type: "template",
      template: {
        name: config.templateName,
        language: { code: config.lang },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: alert.orderRef },
              { type: "text", text: alert.customerName },
              { type: "text", text: alert.phone },
              { type: "text", text: alert.zone },
              { type: "text", text: alert.total },
            ],
          },
        ],
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[WhatsApp] Alert for ${alert.orderRef} failed (HTTP ${res.status}):`,
        text.slice(0, 300)
      );
      return false;
    }

    console.log(`[WhatsApp] New-order alert sent for ${alert.orderRef}.`);
    return true;
  } catch (err) {
    // Swallow: an order must never fail because a notification failed.
    console.error(`[WhatsApp] Alert for ${alert.orderRef} threw:`, err);
    return false;
  }
}