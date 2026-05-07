// src/app/product/[id]/page.tsx
import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, getProductsPreview } from "@/lib/api";
import ProductDetailsClient from "@/components/shared/ProductDetailsClient";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductBySlug(id);

  if (!product) {
    return { title: "Product Not Found" };
  }

  return {
    title: product.name,
    description: product.description || `Buy ${product.name} from Kafunda Wines & Spirits. Fast delivery in Kampala.`,
    openGraph: {
      title: `${product.name} | Kafunda Wines & Spirits`,
      description: product.description || `Buy ${product.name} from Kafunda Wines & Spirits.`,
      images: product.image_url ? [{ url: product.image_url, width: 800, height: 800, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Kafunda Wines & Spirits`,
      description: product.description || `Buy ${product.name} from Kafunda Wines & Spirits.`,
      images: product.image_url ? [product.image_url] : [],
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

    if (!product) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <h1 className="text-2xl font-black uppercase tracking-tighter mb-4">Product not found</h1>
                <p className="text-zinc-500 mb-8">This item may have been removed or is currently unavailable.</p>
                <Link href="/shop" className="bg-primary-red hover:bg-primary-red-hover text-white px-8 py-4 font-bold uppercase tracking-widest text-sm transition-colors">
                    Return to Shop
                </Link>
            </div>
        );
    }

    const primaryCategory = product.category.split(',')[0].trim();
    const relatedProducts = previewProducts
        .filter((p) => p.id !== product.id && p.category.includes(primaryCategory))
        .slice(0, 4);

    return <ProductDetailsClient product={product} relatedProducts={relatedProducts} />;
}