/**
 * Android App Links — lets shop.kafundawines.com links open straight in the
 * Kafunda Android app when it's installed.
 *
 * Env (Vercel):
 *   ANDROID_PACKAGE_NAME       e.g. "com.kafunda.winestore"
 *   ANDROID_SHA256_CERT        signing-cert SHA-256 fingerprint(s), comma-separated
 *                              (Play Console → App integrity → App signing).
 * The app must also declare an autoVerify intent filter for shop.kafundawines.com.
 * Until configured this returns 404 and links keep opening in the browser.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME?.trim();
  const fingerprints = (process.env.ANDROID_SHA256_CERT || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!pkg || fingerprints.length === 0) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: pkg,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
