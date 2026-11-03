/**
 * /api/cart/save — abandoned-cart capture, called by checkout.
 *  { token, name, phone, email, items:[{id,quantity}] }   → save/update the cart
 *  { token, converted: true, orderId }                    → the order went through
 *
 * Forwards to the Kafunda Marketing WordPress endpoints, which look up real
 * product names/prices and send the reminder emails. Never fails loudly:
 * checkout carries on regardless.
 */
import { NextRequest, NextResponse } from "next/server";
import { wpPublic } from "@/lib/marketing/wp";

const TOKEN_RE = /^[A-Za-z0-9-]{16,64}$/;

// Light per-token throttle: one save every 5s is plenty for a debounced form.
const lastSave = new Map<string, number>();

export async function POST(request: NextRequest) {
  const b = (await request.json().catch(() => ({}))) as {
    token?: string; name?: string; phone?: string; email?: string;
    items?: { id?: string; quantity?: number }[]; converted?: boolean; orderId?: number;
  };
  const token = String(b.token ?? "");
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "Bad token" }, { status: 400 });

  if (b.converted) {
    await wpPublic("convert", { method: "POST", body: { token, order_id: Number(b.orderId) || 0 } });
    return NextResponse.json({ ok: true });
  }

  const now = Date.now();
  if (now - (lastSave.get(token) ?? 0) < 5_000) return NextResponse.json({ ok: true, throttled: true });
  lastSave.set(token, now);
  if (lastSave.size > 5_000) lastSave.clear();

  const phone = String(b.phone ?? "").replace(/[^\d+]/g, "").slice(0, 20);
  const email = String(b.email ?? "").trim().slice(0, 190);
  const items = (Array.isArray(b.items) ? b.items : [])
    .slice(0, 50)
    .map((i) => ({ id: String(i.id ?? ""), quantity: Math.min(999, Math.max(1, Math.floor(Number(i.quantity) || 1))) }))
    .filter((i) => i.id);
  if ((!phone && !email) || items.length === 0) return NextResponse.json({ ok: true, skipped: true });

  const r = await wpPublic("cart", {
    method: "POST",
    body: { token, name: String(b.name ?? "").slice(0, 120), phone, email, items },
  });
  return NextResponse.json({ ok: r.ok });
}
