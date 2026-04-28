import { NextResponse } from 'next/server';

export async function GET() {
  const authUser = process.env.WP_APP_USER || process.env.WC_CONSUMER_KEY;
  const authPass = process.env.WP_APP_PASS || process.env.WC_CONSUMER_SECRET;

  if (!authUser || !authPass) {
    return NextResponse.json({
      status: 'error',
      problem: 'MISSING_CREDENTIALS',
      message: 'No WP_APP_USER/WP_APP_PASS or WC_CONSUMER_KEY/WC_CONSUMER_SECRET found in environment.',
      fix: 'Add these variables in Vercel → Project → Settings → Environment Variables, then redeploy.',
    });
  }

  const base64Auth = Buffer.from(`${authUser}:${authPass}`).toString('base64');
  const url = 'https://kafundawines.com/wp-json/wc/v3/products/categories?hide_empty=true&per_page=5';

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${base64Auth}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; KafundaApp/1.0)',
      },
      cache: 'no-store',
    });

    const body = await res.text();

    if (res.ok) {
      const data = JSON.parse(body);
      return NextResponse.json({
        status: 'ok',
        message: `WooCommerce API reachable. Found ${data.length} categories.`,
        sample: data.slice(0, 2).map((c: { id: number; name: string }) => ({ id: c.id, name: c.name })),
      });
    }

    return NextResponse.json({
      status: 'error',
      problem: `HTTP_${res.status}`,
      message: `WooCommerce returned ${res.status}. The server is blocking requests from Vercel.`,
      responsePreview: body.substring(0, 300),
      fix: res.status === 403
        ? 'Your host (likely Cloudflare) is blocking Vercel\'s servers. In Cloudflare: Security → WAF → create a Bypass rule for URI path contains /wp-json/'
        : 'Check credentials and WooCommerce REST API settings.',
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      problem: 'FETCH_FAILED',
      message: String(err),
    });
  }
}
