import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AgeVerification from "@/components/shared/AgeVerification";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://kafundawines.com";
const OG_IMAGE = `${SITE_URL}/og-default.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kafunda Wines & Spirits | Premium Liquor Delivery in Kampala",
    template: "%s | Kafunda Wines & Spirits",
  },
  description:
    "Kampala's premium online liquor store. Shop 500+ wines, whiskies, gins, and spirits with 1–2 hour delivery to your door.",
  keywords: ["wine delivery kampala", "whisky uganda", "spirits delivery", "kafunda wines", "alcohol delivery kampala"],
  authors: [{ name: "Kafunda Wines & Spirits" }],
  openGraph: {
    type: "website",
    siteName: "Kafunda Wines & Spirits",
    url: SITE_URL,
    title: "Kafunda Wines & Spirits | Premium Liquor Delivery in Kampala",
    description:
      "Kampala's premium online liquor store. Shop 500+ wines, whiskies, gins, and spirits with 1–2 hour delivery.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Kafunda Wines & Spirits" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kafunda Wines & Spirits | Premium Liquor Delivery in Kampala",
    description:
      "Kampala's premium online liquor store. Shop 500+ wines, whiskies, gins, and spirits with 1–2 hour delivery.",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans text-zinc-900 overflow-x-hidden"
        suppressHydrationWarning
      >
        <CartProvider>
          <AgeVerification />
          <Navbar />
          <main className="grow pb-16 md:pb-0">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
