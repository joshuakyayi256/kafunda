// src/app/product/[id]/page.tsx
import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getProductsPreview } from "@/lib/api";
import { SITE } from "@/lib/constants";
import ProductDetailsClient from "@/components/shared/ProductDetailsClient";
import type { Product } from "@/types";

/** Woo descriptions are HTML — search snippets need plain, short text. */
function plainDescription(product: Product): string {
  const text = (product.description || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  const fallback = `Buy ${product.name} online in Uganda from Kafunda Wines & Spirits. Fast delivery across Kampala — pay by mobile money, card or cash on delivery.`;
  if (!text) return fallback;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductBySlug(id);

  if (!product) {
    return { title: "Product Not Found", robots: { index: false } };
  }

  const title = `${product.name} — Price in Uganda`;
  const description = plainDescription(product);

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      type: "website",
      url: `/product/${product.id}`,
      title: `${product.name} | Kafunda Wines & Spirits`,
      description,
      images: product.image_url ? [{ url: product.image_url, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Kafunda Wines & Spirits`,
      description,
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

/** schema.org Product — lets Google show price and stock in search results. */
function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [product.image_url, ...(product.gallery_urls || [])].filter(Boolean),
    description: plainDescription(product),
    sku: product.id,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    category: product.category.split(",")[0]?.trim() || undefined,
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/product/${product.id}`,
      priceCurrency: "UGX",
      price: product.price_ugx,
      availability: product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE.name },
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    // Await the params to get the product slug/id
    const { id } = await params;
    
    // Fetch product and a preview pool for related items in parallel
    const [product, previewProducts] = await Promise.all([
        getProductBySlug(id),
        getProductsPreview(20),
    ]);

    // Real 404 status (not a 200 "not found" page) so search engines drop it.
    if (!product) notFound();

    const primaryCategory = product.category.split(',')[0].trim();
    const relatedProducts = previewProducts
        .filter((p) => p.id !== product.id && p.category.includes(primaryCategory))
        .slice(0, 4);

    return (
        <>
            <script
                type="application/ld+json"
                // JSON-LD must be raw JSON; "<" is escaped so product text can't break out of the tag.
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)).replace(/</g, "\\u003c") }}
            />
            <ProductDetailsClient product={product} relatedProducts={relatedProducts} />
        </>
    );
}