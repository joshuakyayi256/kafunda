/**
 * Store-wide sales shown on the homepage (hero, picks grid, WhatsApp band).
 *
 * To run the next one, add it here AND in kafunda_mkt_campaign() in the
 * WordPress snippet, so pushes and the site name the same sale. Outside every
 * window the homepage simply says "Today's Picks", so a sale never lingers.
 *
 * A saving is only ever shown for products with a sale price in WooCommerce
 * (wp-admin → Products, with the "Schedule" dates).
 */
export interface Campaign {
  name: string;
  start: Date;
  end: Date;
  /** Shown on the hero, e.g. "Ends 30 Nov". */
  endsLabel: string;
}

/** Kampala time (EAT, UTC+3). */
export const CAMPAIGNS: Campaign[] = [
  {
    name: "Black November",
    start: new Date("2026-11-01T00:00:00+03:00"),
    end: new Date("2026-11-30T23:59:59+03:00"),
    endsLabel: "Ends 30 Nov",
  },
  {
    name: "Christmas Sale",
    start: new Date("2026-12-01T00:00:00+03:00"),
    end: new Date("2026-12-25T23:59:59+03:00"),
    endsLabel: "Ends 25 Dec",
  },
];

export function currentCampaign(now: number = Date.now()): Campaign | null {
  return CAMPAIGNS.find((c) => now >= c.start.getTime() && now <= c.end.getTime()) ?? null;
}
