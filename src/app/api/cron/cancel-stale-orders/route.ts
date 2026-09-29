/**
 * /api/cron/cancel-stale-orders — daily Vercel cron (see vercel.json).
 * Closes Pesapal orders left in "Pending payment" for over an hour.
 * Protected by CRON_SECRET: Vercel sends it as a Bearer token.
 */

import { NextRequest, NextResponse } from "next/server";
import { cancelStalePesapalOrders } from "@/lib/staleOrders";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cancelled = await cancelStalePesapalOrders();
    return NextResponse.json({ ok: true, cancelled });
  } catch (err) {
    console.error("[cron] cancel-stale-orders failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
