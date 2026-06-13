// convert-seed.mjs
// ----------------------------------------------------------------------------
// Turns raw kafunda-core API output into the mapped `Product` shape that the
// frontend (ProductCard, shop, etc.) expects, and writes src/data/products.json.
//
// This gives localhost the REAL catalogue without depending on the WAF: pull
// the data through your BROWSER (which has a trusted session), save it, convert.
//
// USAGE:
//   1. In your browser, open (paging if there are >100 products):
//      https://kafundawines.com/wp-json/kafunda/v1/products?per_page=100&kkey=YOUR_KEY
//      Save each page's JSON. Concatenate all pages into one array in a file
//      called raw-products.json in the project root. (One page is fine to start.)
//   2. node convert-seed.mjs
//   3. Restart dev. Localhost now serves the real catalogue from cache/fallback.
//
// The mapping mirrors mapProduct() in src/lib/api.ts so shapes stay identical.

import { readFileSync, writeFileSync } from "node:fs";

const INPUT = "raw-products.json";
const OUTPUT = "src/data/products.json";

function decodeEntities(str) {
  if (!str) return "";
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8230;/g, "...")
    .replace(/&nbsp;/g, " ");
}

function mapProduct(node) {
  const categoryNames =
    (node.categories || []).map((c) => decodeEntities(c.name)).join(", ") ||
    "Uncategorized";
  const rawDescription = node.short_description || node.description || "";
  const cleanDescription =
    decodeEntities(rawDescription.replace(/<[^>]*>?/gm, "").trim()) ||
    "No description available.";

  return {
    id: node.id.toString(),
    name: decodeEntities(node.name) || "Unknown Product",
    brand: "Kafunda Selection",
    category: categoryNames,
    price_ugx: Number(node.price || 0),
    original_price_ugx:
      node.regular_price && Number(node.regular_price) > Number(node.price)
        ? Number(node.regular_price)
        : null,
    image_url: node.images?.[0]?.src || "/product-placeholder.svg",
    gallery_urls: (node.images || []).map((img) => img.src),
    in_stock: node.stock_status === "instock",
    is_sale: !!node.on_sale,
    description: cleanDescription,
    abv: "N/A",
    volume: "750ml",
    stock_count: node.stock_quantity || 5,
  };
}

let raw;
try {
  raw = JSON.parse(readFileSync(INPUT, "utf8"));
} catch (e) {
  console.error(`Could not read/parse ${INPUT}:`, e.message);
  console.error("Create raw-products.json with the browser JSON first (see header).");
  process.exit(1);
}

if (!Array.isArray(raw)) {
  console.error(`${INPUT} must be a JSON array of products.`);
  process.exit(1);
}

const mapped = raw.map(mapProduct);
writeFileSync(OUTPUT, JSON.stringify(mapped, null, 2));
console.log(`Wrote ${mapped.length} products -> ${OUTPUT}`);
console.log("Restart the dev server to pick it up.");
