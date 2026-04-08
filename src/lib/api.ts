// src/lib/api.ts
import { Product } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;

export async function fetchGraphQL(query: string, variables?: Record<string, unknown>) {
  if (!API_URL) {
    console.warn("NEXT_PUBLIC_WORDPRESS_API_URL is not defined in .env.local");
    return null;
  }

  const payload = variables ? { query, variables } : { query };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, 
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (json.errors) {
      const errorMessage = json.errors.map((e: { message: string }) => e.message).join(', ');
      console.error('GraphQL Errors:', JSON.stringify(json.errors, null, 2));
      throw new Error(errorMessage || 'Failed to fetch API');
    }

    return json.data;
  } catch (error: unknown) {
    console.error("Error fetching from WordPress:", error);
    throw error;
  }
}

function parseWooPrice(priceStr?: string): number {
  if (!priceStr) return 0;
  return Number(priceStr.replace(/[^0-9]/g, ""));
}

export async function getCategories() {
  const query = `
    query GetCategories {
      productCategories(first: 100, where: { hideEmpty: true }) {
        nodes {
          name
          slug
        }
      }
    }
  `;

  const data = await fetchGraphQL(query);
  return data?.productCategories?.nodes || [];
}

export async function getAllProducts(): Promise<Product[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allNodes: any[] = [];
  let hasNextPage = true;
  let afterCursor = null;

  while (hasNextPage) {
    const query = `
      query GetProducts($after: String) {
        products(first: 100, after: $after, where: { status: "publish" }) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            databaseId
            name
            slug
            description
            shortDescription
            productCategories {
              nodes {
                name
              }
            }
            image {
              sourceUrl
              altText
            }
            ... on SimpleProduct {
              price
              regularPrice
              salePrice
              stockStatus
              stockQuantity
            }
          }
        }
      }
    `;

    const data = await fetchGraphQL(query, { after: afterCursor });
    const productsData = data?.products;

    if (!productsData) break;

    allNodes = [...allNodes, ...(productsData.nodes || [])];
    hasNextPage = productsData.pageInfo?.hasNextPage || false;
    afterCursor = productsData.pageInfo?.endCursor || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedProducts: Product[] = allNodes.map((node: any) => {
    const currentPrice = parseWooPrice(node.price);
    const regularPrice = parseWooPrice(node.regularPrice);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryNames = node.productCategories?.nodes?.map((c: any) => c.name).join(", ") || "Uncategorized";

    const rawDescription = node.shortDescription || node.description || "";
    const cleanDescription = rawDescription.replace(/<[^>]*>?/gm, '').trim() || "No description available.";

    return {
      id: node.id || node.databaseId?.toString(),
      name: node.name || "Unknown Product",
      brand: "Kafunda Selection", 
      category: categoryNames,
      price_ugx: currentPrice,
      original_price_ugx: regularPrice > currentPrice ? regularPrice : null,
      image_url: node.image?.sourceUrl || "/don julio.webp",
      gallery_urls: node.image?.sourceUrl ? [node.image.sourceUrl] : [],
      in_stock: node.stockStatus === "IN_STOCK",
      is_sale: !!node.salePrice,
      description: cleanDescription,
      abv: "N/A",
      volume: "750ml",
      stock_count: node.stockQuantity || 5,
    };
  });

  const uniqueProducts = Array.from(
    new Map(mappedProducts.map((p) => [p.id, p])).values()
  );

  return uniqueProducts;
}

export async function getProductBySlug(id: string): Promise<Product | null> {
  const query = `
    query GetProductById($id: ID!) {
      product(id: $id, idType: ID) {
        id
        databaseId
        name
        slug
        description
        shortDescription
        productCategories {
          nodes {
            name
          }
        }
        image {
          sourceUrl
        }
        galleryImages {
          nodes {
            sourceUrl
          }
        }
        ... on SimpleProduct {
          price
          regularPrice
          stockStatus
          stockQuantity
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, { id });
  
  if (!data?.product) return null;
  
  const node = data.product;
  const currentPrice = parseWooPrice(node.price);
  const regularPrice = parseWooPrice(node.regularPrice);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gallery = node.galleryImages?.nodes?.map((img: any) => img.sourceUrl) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryNames = node.productCategories?.nodes?.map((c: any) => c.name).join(", ") || "Uncategorized";
  
  const rawDescription = node.shortDescription || node.description || "";
  const cleanDescription = rawDescription.replace(/<[^>]*>?/gm, '').trim() || "No description available.";

  return {
    id: node.id || node.databaseId?.toString(),
    name: node.name || "Unknown Product",
    brand: "Kafunda Selection",
    category: categoryNames,
    price_ugx: currentPrice,
    original_price_ugx: regularPrice > currentPrice ? regularPrice : null,
    image_url: node.image?.sourceUrl || "/don julio.webp",
    gallery_urls: gallery.length > 0 ? gallery : (node.image?.sourceUrl ? [node.image.sourceUrl] : []),
    in_stock: node.stockStatus === "IN_STOCK",
    is_sale: !!node.regularPrice && currentPrice < regularPrice,
    description: cleanDescription,
    abv: "N/A",
    volume: "750ml",
    stock_count: node.stockQuantity || 5,
  };
}

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

function getDatabaseId(globalId: string): number {
  if (!isNaN(Number(globalId))) return Number(globalId);
  try {
    const decoded = typeof window !== 'undefined' ? atob(globalId) : Buffer.from(globalId, 'base64').toString('utf-8');
    const match = decoded.match(/\d+$/);
    if (match) return parseInt(match[0], 10);
  } catch (e) {
    console.error("Failed to decode ID:", globalId, e);
  }
  return 0;
}

// THE UPDATED CHECKOUT FUNCTION WITH SESSION HANDSHAKE
export async function createOrder(customerData: CheckoutFormData, cartItems: CartItem[]) {
  if (!API_URL) throw new Error("API URL is not defined");

  let sessionToken = "";

  // Helper function to maintain a WordPress cart session
  async function fetchWithSession(query: string, variables?: Record<string, unknown>) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Attach the session token if we have one
    if (sessionToken) {
      headers['woocommerce-session'] = `Session ${sessionToken}`;
    }

    const res = await fetch(API_URL as string, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    // Capture the session token WordPress gives us on the very first request
    const returnedSession = res.headers.get('woocommerce-session');
    if (returnedSession) {
      sessionToken = returnedSession;
    }

    const json = await res.json();
    if (json.errors) {
      const errorMessage = json.errors.map((e: { message: string }) => e.message).join(', ');
      throw new Error(errorMessage);
    }
    return json.data;
  }

  // STEP 1: Add every item in the cart to the WordPress Session
  for (const item of cartItems) {
    const databaseId = getDatabaseId(item.product.id);
    const addQuery = `
      mutation AddToCart($productId: Int!, $quantity: Int!) {
        addToCart(input: { productId: $productId, quantity: $quantity }) {
          clientMutationId
        }
      }
    `;
    await fetchWithSession(addQuery, { productId: databaseId, quantity: item.quantity });
  }

  // STEP 2: Execute Checkout using the established session (Notice: NO lineItems!)
  const checkoutMutation = `
    mutation Checkout($input: CheckoutInput!) {
      checkout(input: $input) {
        order {
          databaseId
          status
          total
        }
      }
    }
  `;

  const variables = {
    input: {
      clientMutationId: "kafunda_checkout",
      billing: {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        phone: customerData.phone,
        email: customerData.email,
        address1: customerData.address,
        city: customerData.city,
        country: "UG", 
      },
      shipping: {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        address1: customerData.address,
        city: customerData.city,
        country: "UG",
      },
      paymentMethod: "cod", 
      isPaid: false,
    }
  };

  const data = await fetchWithSession(checkoutMutation, variables);
  
  if (!data?.checkout) {
    throw new Error("Failed to process checkout. No data returned.");
  }
  
  return data.checkout.order;
}