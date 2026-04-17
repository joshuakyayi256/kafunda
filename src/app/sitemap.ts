import { MetadataRoute } from 'next';
import { SITE, CATEGORIES } from '@/lib/constants';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = SITE.url;

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
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    const categoryRoutes = CATEGORIES.map((category) => ({
        url: `${baseUrl}/shop?category=${encodeURIComponent(category)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    return [...routes, ...categoryRoutes];
}
