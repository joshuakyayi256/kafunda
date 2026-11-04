// Refreshes src/data/catalogue-snapshot.json from the LIVE shop's /api/products.
// The snapshot is the last-resort catalogue served when WooCommerce is
// unreachable (see getAllProducts in src/lib/api.ts). Run before deploying:
//   npm run snapshot
// Override the source with SNAPSHOT_SOURCE=https://.../api/products
import { writeFileSync } from "node:fs";

const SOURCE = process.env.SNAPSHOT_SOURCE || "https://shop.kafundawines.com/api/products";
const OUT = new URL("../src/data/catalogue-snapshot.json", import.meta.url);

const res = await fetch(SOURCE, { headers: { Accept: "application/json" } });
if (!res.ok) throw new Error(`Snapshot fetch failed: HTTP ${res.status}`);

const { products } = await res.json();
if (!Array.isArray(products) || products.length === 0) {
  // Never overwrite a good snapshot with an empty one (the live site may be mid-outage).
  throw new Error("Live catalogue returned no products — snapshot left unchanged.");
}

writeFileSync(OUT, JSON.stringify({ takenAt: new Date().toISOString(), products }) + "\n");
console.log(`Saved ${products.length} products to src/data/catalogue-snapshot.json`);
