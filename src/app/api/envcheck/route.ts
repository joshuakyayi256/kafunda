// TEMP DIAGNOSTIC — src/app/api/envcheck/route.ts
// Delete after debugging. Mirrors the exact logic in src/lib/api.ts.
export const dynamic = "force-dynamic";

export async function GET() {
  const CUSTOM_API_KEY = process.env.KAFUNDA_CORE_KEY || "";
  const USE_CUSTOM_API =
    process.env.WP_CUSTOM_API === "1" && CUSTOM_API_KEY.length > 0;

  // Actually try the custom endpoint live, server-side, right now:
  const base = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com";
  const testUrl = `${base}/wp-json/kafunda/v1/products?per_page=2&kkey=${encodeURIComponent(CUSTOM_API_KEY)}`;
  let liveProbe: unknown = null;
  let probeStatus = 0;
  try {
    const r = await fetch(testUrl, { cache: "no-store" });
    probeStatus = r.status;
    const text = await r.text();
    try { liveProbe = JSON.parse(text); }
    catch { liveProbe = text.slice(0, 200); }
  } catch (e) {
    liveProbe = `fetch threw: ${(e as Error).message}`;
  }

  return Response.json({
    WP_CUSTOM_API: process.env.WP_CUSTOM_API ?? "(undefined)",
    KAFUNDA_CORE_KEY_len: CUSTOM_API_KEY.length,
    USE_CUSTOM_API_evaluates_to: USE_CUSTOM_API,
    namespace_would_be: USE_CUSTOM_API ? "kafunda/v1" : "wc/v3",
    live_probe_status: probeStatus,
    live_probe_result: liveProbe,
  });
}