import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    unoptimized: true, // TEMP: until kafundawines.com serves its full SSL chain
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "kafundawines.com" },
      { protocol: "https", hostname: "www.kafundawines.com" },
    ],
  },
  // The marketing dashboard lives in WordPress (Kafunda Marketing snippet).
  async redirects() {
    return [
      { source: "/marketing", destination: "https://kafundawines.com/marketing", permanent: false },
    ];
  },
};

export default nextConfig;