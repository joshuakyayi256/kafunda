import { MetadataRoute } from 'next';
import { SITE, CATEGORIES } from '@/lib/constants';
import { getAllProducts } from '@/lib/api';

// Rebuilt at most once a day — the full catalogue walk is not cheap.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = SITE.url;
    const now = new Date();

    const routes = [
        '',
        '/shop',
        '/about',
        '/delivery',
        '/contact',
        '/privacy',
        '/terms',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1 : route === '/shop' ? 0.9 : 0.5,
    }));

    const categoryRoutes = CATEGORIES.map((category) => ({
        url: `${baseUrl}/shop?category=${encodeURIComponent(category)}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }));

    // Every product page, so search engines find them without crawling the
    // shop. If the catalogue is unreachable, ship the static part rather
    // than failing the whole sitemap.
    let productRoutes: MetadataRoute.Sitemap = [];
    try {
        const products = await getAllProducts();
        productRoutes = products.map((p) => ({
            url: `${baseUrl}/product/${p.id}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
            ...(p.image_url ? { images: [p.image_url] } : {}),
        }));
    } catch (err) {
        console.error('[sitemap] Product list unavailable:', err);
    }

    return [...routes, ...categoryRoutes, ...productRoutes];
}
