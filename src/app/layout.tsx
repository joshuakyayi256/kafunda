import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AgeVerification from "@/components/shared/AgeVerification"; // 1. Import the component

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kafunda Wines and Spirits | Premium Liquor Delivery",
  description: "Elevate your evenings with Kafunda's curated selection of premium wines, rare whiskies, and craft spirits delivered to your door.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans text-zinc-900 overflow-x-hidden"
        suppressHydrationWarning
      >
        <CartProvider>
          <AgeVerification /> {/* 2. Render it before the Navbar */}
          <Navbar />
          <main className="grow">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}