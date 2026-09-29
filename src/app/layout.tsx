import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/context/ToastContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/layout/Navbar";
import CartDrawer from "@/components/shared/CartDrawer";
import Footer from "@/components/layout/Footer";
import AgeVerification from "@/components/shared/AgeVerification";
import SmoothScroll from "@/components/providers/SmoothScroll";
import { SITE, CONTACT, SOCIAL, STORES, IOS_APP_ID } from "@/lib/constants";

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
// Was /og-default.jpg, which doesn't exist — shared links showed no image.
const OG_IMAGE = `${SITE_URL}/kafunda-logo-full.png`;

/** schema.org store data — helps "liquor store near me" / Google Maps results. */
const STORE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "LiquorStore",
  name: SITE.name,
  url: SITE_URL,
  logo: `${SITE_URL}/kafunda-icon.png`,
  image: OG_IMAGE,
  description: SITE.description,
  telephone: CONTACT.phoneDial,
  email: CONTACT.email,
  priceRange: "UGX",
  currenciesAccepted: "UGX",
  paymentAccepted: "Cash, Mobile Money, Credit Card",
  areaServed: { "@type": "City", name: "Kampala" },
  address: {
    "@type": "PostalAddress",
    streetAddress: CONTACT.address,
    addressLocality: "Kampala",
    addressCountry: "UG",
  },
  sameAs: Object.values(SOCIAL),
  department: STORES.map((s) => ({
    "@type": "LiquorStore",
    name: s.name,
    telephone: s.phone,
    address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: "Kampala", addressCountry: "UG" },
    geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng },
  })),
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kafunda Wines & Spirits | Premium Liquor Delivery in Kampala",
    template: "%s | Kafunda Wines & Spirits",
  },
  description:
    "Kampala's premium online liquor store. Shop 500+ wines, whiskies, gins, and spirits with 1–2 hour delivery to your door.",
  keywords: [
    "wine delivery kampala", "whisky uganda", "spirits delivery", "kafunda wines",
    "alcohol delivery kampala", "buy wine online uganda", "liquor store kampala",
    "gin uganda", "champagne kampala", "beer delivery kampala",
  ],
  authors: [{ name: "Kafunda Wines & Spirits" }],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: { icon: "/kafunda-icon.png", apple: "/kafunda-icon.png" },
  // Safari Smart App Banner: "Open" if the Kafunda app is installed, "Get" if not.
  itunes: { appId: IOS_APP_ID },
  openGraph: {
    type: "website",
    siteName: "Kafunda Wines & Spirits",
    url: SITE_URL,
    title: "Kafunda Wines & Spirits | Premium Liquor Delivery in Kampala",
    description:
      "Kampala's premium online liquor store. Shop 500+ wines, whiskies, gins, and spirits with 1–2 hour delivery.",
    images: [{ url: OG_IMAGE, alt: "Kafunda Wines & Spirits" }],
    locale: "en_UG",
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
      {/* kafunda-textured-site puts the barkcloth texture behind the whole
          site; sections float on top of it (see globals.css). */}
      <body
        className="kafunda-textured-site min-h-full flex flex-col font-sans text-kafunda-ink overflow-x-hidden"
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STORE_JSON_LD).replace(/</g, "\\u003c") }}
        />
        <ToastProvider>
          <CartProvider>
            <AgeVerification />
            <Navbar />
            <CartDrawer />
            <SmoothScroll>
              <main className="grow pb-16 md:pb-0">
                {children}
              </main>
            </SmoothScroll>
            <Footer />
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}