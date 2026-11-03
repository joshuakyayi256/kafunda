/**
 * Seasonal campaign shown on the homepage (hero, deals section, banners).
 *
 * To run the next one, change the dates and wording here. Outside the
 * start–end window the homepage falls back to the normal hero automatically,
 * so an expired campaign never lingers.
 *
 * Discounts themselves come from WooCommerce: set a sale price (and the
 * "Schedule" dates) on each product in wp-admin → Products. Products with a
 * sale price show up in the deals section with their real "−X%" badge.
 */
export const CAMPAIGN = {
  name: "Black November",
  /** Kampala time (EAT, UTC+3). */
  start: new Date("2026-11-01T00:00:00+03:00"),
  end: new Date("2026-11-30T23:59:59+03:00"),
  tagline: "Our month-long sale on wines, spirits & beer",
  dealsHref: "/shop?filter=offers",
} as const;

export function campaignLive(now: number = Date.now()): boolean {
  return now >= CAMPAIGN.start.getTime() && now <= CAMPAIGN.end.getTime();
}
