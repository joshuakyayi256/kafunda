/** /api/subscribe — offers sign-up popup → WordPress subscriber list. */
import { NextRequest, NextResponse } from "next/server";
import { wpPublic } from "@/lib/marketing/wp";

const hits = new Map<string, { n: number; t: number }>();

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const h = hits.get(ip);
  if (h && now - h.t < 60 * 60 * 1000 && h.n >= 10) {
    return NextResponse.json({ error: "Too many sign-ups from this connection. Try later." }, { status: 429 });
  }
  hits.set(ip, h && now - h.t < 60 * 60 * 1000 ? { n: h.n + 1, t: h.t } : { n: 1, t: now });

  const b = (await request.json().catch(() => ({}))) as { email?: string; source?: string };
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const r = await wpPublic("subscribe", {
    method: "POST",
    body: { email, source: String(b.source ?? "popup").slice(0, 30) },
  });
  if (!r.ok) return NextResponse.json({ error: "Could not sign you up just now. Please try again." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
