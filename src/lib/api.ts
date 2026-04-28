// src/lib/api.ts
import { Product } from "@/types";

// We extract just the base domain (e.g., https://kafundawines.com) 
const RAW_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://kafundawines.com";
const BASE_URL = RAW_URL.replace(/\/graphql\/?$/, ""); // Removes /graphql if it's there

// WooCommerce REST API uses consumer key/secret. WP App Password is fallback only.
const AUTH_USER = process.env.WC_CONSUMER_KEY || process.env.WP_APP_USER;
const AUTH_PASS = process.env.WC_CONSUMER_SECRET || process.env.WP_APP_PASS;

/**
 * MASTER FETCH FUNCTION - Uses Basic Auth via standard Authorization headers
 */
async function fetchWooREST(endpoint: string, method: string = 'GET', body?: unknown) {
  if (!AUTH_USER || !AUTH_PASS) {
    throw new Error(
      "Authentication credentials not found. " +
      "Please set WP_APP_USER and WP_APP_PASS (or WC_CONSUMER_KEY and WC_CONSUMER_SECRET) in Vercel."
    );
  }

  // Create standard Basic Auth token
  const base64Auth = Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString('base64');

  // No longer appending keys directly to the URL to prevent Firewall flagging
  const url = `${BASE_URL}/wp-json/wc/v3/${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Basic ${base64Auth}`,
    // Sending a clean, honest User-Agent instead of faking Chrome which triggers anti-bot WAF rules
    'User-Agent': 'KafundaVercelBuild/1.0'
  };

  try {
    const res = await fetch(url, {
      method,
      headers,
      next: { revalidate: 60 }, 
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      console.error(`WooCommerce API Error (HTTP ${res.status}) on endpoint: ${endpoint}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("WooCommerce Fetch Error:", error);
    return null;
  }
}

export interface WPCategory {
  id: string;
  name: string;
  slug: string;
  image: { sourceUrl: string } | null;
}

// 1. FETCH CATEGORIES
export async function getCategories(): Promise<WPCategory[]> {
  const data = await fetchWooREST('products/categories?hide_empty=true&per_page=100');
  if (!data || !Array.isArray(data)) return [];
  
  return data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => c.slug !== 'uncategorized')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => ({
      id: c.id.toString(),
      name: c.name,
      slug: c.slug,
      image: c.image ? { sourceUrl: c.image.src } : null
    }));
}

// 2. FETCH ALL PRODUCTS (Now with Pagination for 500+ products!)
export async function getAllProducts(): Promise<Product[]> {
  let allRawProducts: unknown[] = [];
  let page = 1;
  let hasMorePages = true;

  // Keep turning the pages until we run out of products
  while (hasMorePages) {
    const data = await fetchWooREST(`products?status=publish&per_page=100&page=${page}`);
    
    // If the API fails or returns an empty array, stop the loop
    if (!data || !Array.isArray(data) || data.length === 0) {
      hasMorePages = false;
      break;
    }

    // Add this page's products to our massive master list
    allRawProducts = [...allRawProducts, ...data];

    // If the API gave us exactly 100 products, there is probably a next page.
    // If it gave us less than 100 (e.g., 42 products), we know we hit the very end!
    if (data.length === 100) {
      page++; // Go to the next page for the next loop
    } else {
      hasMorePages = false; // Stop the loop
    }
  }

  // Now map all 500+ products into our beautiful Next.js Product format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return allRawProducts.map((node: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryNames = node.categories?.map((c: any) => c.name).join(", ") || "Uncategorized";
    const rawDescription = node.short_description || node.description || "";
    const cleanDescription = rawDescription.replace(/<[^>]*>?/gm, '').trim() || "No description available.";

    return {
      id: node.id.toString(),
      name: node.name || "Unknown Product",
      brand: "Kafunda Selection",
      category: categoryNames,
      price_ugx: Number(node.price || 0),
      original_price_ugx: node.regular_price && Number(node.regular_price) > Number(node.price) ? Number(node.regular_price) : null,
      image_url: node.images?.[0]?.src || "/don julio.webp",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gallery_urls: node.images?.map((img: any) => img.src) || [],
      in_stock: node.stock_status === "instock",
      is_sale: node.on_sale,
      description: cleanDescription,
      abv: "N/A",
      volume: "750ml",
      stock_count: node.stock_quantity || 5,
    };
  });
}

// 3. FETCH SINGLE PRODUCT BY ID OR SLUG
export async function getProductBySlug(idOrSlug: string): Promise<Product | null> {
  const isNumericId = /^\d+$/.test(idOrSlug);

  // Numeric IDs use the direct endpoint (returns object); slugs use query param (returns array)
  const data = isNumericId
    ? await fetchWooREST(`products/${idOrSlug}`)
    : await fetchWooREST(`products?slug=${idOrSlug}`);

  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node: any = isNumericId ? data : (Array.isArray(data) && data.length > 0 ? data[0] : null);
  if (!node) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryNames = node.categories?.map((c: any) => c.name).join(", ") || "Uncategorized";
  const rawDescription = node.short_description || node.description || "";
  const cleanDescription = rawDescription.replace(/<[^>]*>?/gm, '').trim() || "No description available.";

  return {
    id: node.id.toString(),
    name: node.name || "Unknown Product",
    brand: "Kafunda Selection",
    category: categoryNames,
    price_ugx: Number(node.price || 0),
    original_price_ugx: node.regular_price && Number(node.regular_price) > Number(node.price) ? Number(node.regular_price) : null,
    image_url: node.images?.[0]?.src || "/don julio.webp",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gallery_urls: node.images?.map((img: any) => img.src) || [],
    in_stock: node.stock_status === "instock",
    is_sale: node.on_sale,
    description: cleanDescription,
    abv: "N/A",
    volume: "750ml",
    stock_count: node.stock_quantity || 5,
  };
}

// 4. SECURE CHECKOUT PROCESSING
export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export async function createOrder(customerData: CheckoutFormData, cartItems: CartItem[]) {
  // Format the order exactly how WooCommerce expects it via REST
  const orderData = {
    payment_method: "cod",
    payment_method_title: "Cash on Delivery",
    set_paid: false,
    billing: {
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      address_1: customerData.address,
      city: customerData.city,
      country: "UG",
      email: customerData.email,
      phone: customerData.phone
    },
    shipping: {
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      address_1: customerData.address,
      city: customerData.city,
      country: "UG"
    },
    line_items: cartItems.map(item => ({
      product_id: parseInt(item.product.id, 10),
      quantity: item.quantity
    }))
  };

  // Post the order directly to Badru's POS database
  const data = await fetchWooREST('orders', 'POST', orderData);

  if (!data || data.code) {
    throw new Error(data?.message || "Failed to process checkout. Ensure items are in stock.");
  }

  return data;
}