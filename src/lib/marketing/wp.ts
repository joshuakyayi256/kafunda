/**
 * Server-only client for the Kafunda Marketing WordPress snippet/plugin
 * (wordpress/kafunda-marketing-snippet.php).
 *
 * Uses its PUBLIC endpoints (/wp-json/kafunda/v1/mkt/public/*), so no secret
 * or Vercel env var is needed. WordPress validates products and rate-limits.
 * Everything else (dashboard, push, emails) lives at kafundawines.com/marketing.
 */

const RAW_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com";
const BASE_URL = RAW_URL.replace(/\/graphql\/?$/, "").replace(/\/$/, "");
const HOSTNAME = new URL(BASE_URL).hostname;
const ORIGIN_IP = process.env.WP_ORIGIN_IP;

export interface WpResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

export async function wpPublic<T = unknown>(
  path: string,
  opts: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string> } = {}
): Promise<WpResult<T>> {
  const qs = opts.query ? `?${new URLSearchParams(opts.query).toString()}` : "";
  const urlBase = ORIGIN_IP ? `http://${ORIGIN_IP}` : BASE_URL;
  const url = `${urlBase}/wp-json/kafunda/v1/mkt/public/${path}${qs}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        ...(ORIGIN_IP ? { Host: HOSTNAME } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const data = (await res.json().catch(() => null)) as T | null;
    if (!res.ok) console.warn(`[marketing] WP ${res.status} on mkt/public/${path}`);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.warn(`[marketing] WP unreachable on mkt/public/${path}:`, err instanceof Error ? err.message : err);
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}
