import { Product } from "@/types";

const KAMPALA_OFFSET_MS = 3 * 3_600_000; // EAT, UTC+3, no daylight saving
const DAY_MS = 86_400_000;
const NOT_A_HERO_PRODUCT = /soft drink|energy|disposable|syrup|offers|uncategorized/i;

/** Day number in Kampala — rolls over at Kampala midnight, not UTC midnight. */
export function kampalaDay(now: number = Date.now()): number {
  return Math.floor((now + KAMPALA_OFFSET_MS) / DAY_MS);
}

/** Timestamp of the next Kampala midnight, when the daily picks change. */
export function nextKampalaMidnight(now: number = Date.now()): number {
  return (kampalaDay(now) + 1) * DAY_MS - KAMPALA_OFFSET_MS;
}

/** Same shuffle for everyone all day, new one tomorrow. */
function shuffleForDay<T>(items: T[], day: number): T[] {
  const copy = [...items];
  let seed = day >>> 0;
  const next = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Today's hero bottles: UGX 30k+ drinks, each from a different category. */
export function pickDailyProducts(sellable: Product[], count = 4, day = kampalaDay()): Product[] {
  const pool = sellable.filter((p) => p.price_ugx >= 30_000 && !NOT_A_HERO_PRODUCT.test(p.category || ""));
  const seen = new Set<string>();
  const picks: Product[] = [];
  for (const p of shuffleForDay(pool, day)) {
    if (seen.has(p.category)) continue;
    seen.add(p.category);
    picks.push(p);
    if (picks.length === count) break;
  }
  return picks;
}
