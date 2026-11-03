/**
 * /api/cart/restore?token=… — powers the "Complete my order" link in
 * abandoned-cart emails and WhatsApp messages (WordPress sends shop carts
 * to /cart?restore=…). Returns the saved lines as fresh, in-stock products.
 */
import { NextRequest, NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/api";
import { wpPublic } from "@/lib/marketing/wp";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9-]{16,80}$/.test(token)) return NextResponse.json({ items: [] }, { status: 404 });

  const r = await wpPublic<{ items: { id: string; quantity: number }[] }>("restore", { query: { token } });
  const saved = r.ok && Array.isArray(r.data?.items) ? r.data.items : [];
  if (saved.length === 0) return NextResponse.json({ items: [] }, { status: 404 });

  try {
    const products = await getProductsByIds(saved.map((i) => String(i.id)));
    const byId = new Map(products.map((p) => [String(p.id), p]));
    const items = saved.flatMap((s) => {
      const p = byId.get(String(s.id));
      return p && p.in_stock ? [{ product: p, quantity: Math.max(1, Number(s.quantity) || 1) }] : [];
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.warn("[cart/restore] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ items: [] }, { status: 502 });
  }
}
