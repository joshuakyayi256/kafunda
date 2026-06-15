export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    WP_CUSTOM_API: process.env.WP_CUSTOM_API ?? "(undefined)",
    KAFUNDA_CORE_KEY_len: (process.env.KAFUNDA_CORE_KEY ?? "").length,
    WORDPRESS_URL: process.env.NEXT_PUBLIC_WORDPRESS_API_URL ?? "(undefined)",
  });
}