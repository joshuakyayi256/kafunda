// src/lib/utils.ts

/** Format a number in UGX with locale grouping. */
export const formatUGX = (amount: number) => {
  return `UGX ${amount.toLocaleString("en-UG")}`;
};

/**
 * Decode HTML entities returned by the WooCommerce REST API.
 *
 * Woo returns names like "Disposables &amp; More" or "Crème &#038; Cassis".
 * React renders these literally (as &amp;), so we decode before passing
 * names to JSX. This is intentionally minimal — Woo only emits a small
 * set of entities and we don't want a heavy `he` dependency.
 */
export function decodeEntities(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/&amp;/g, "&")
    .replace(/&#0?38;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    // Numeric entities — catch-all
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}