/**
 * iOS Universal Links — lets shop.kafundawines.com links open straight in the
 * Kafunda app when it's installed (Safari falls back to the website if not).
 *
 * Env (Vercel): APPLE_APP_IDS = "TEAMID.bundle.id" (comma-separate several).
 * The app itself must also list "applinks:shop.kafundawines.com" under its
 * Associated Domains entitlement. Until the env var is set this returns 404
 * and links simply keep opening in the browser.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const appIds = (process.env.APPLE_APP_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (appIds.length === 0) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs: appIds,
            components: [
              // Checkout and API stay on the web.
              { "/": "/checkout*", exclude: true },
              { "/": "/api/*", exclude: true },
              { "/": "/*" },
            ],
          },
        ],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
