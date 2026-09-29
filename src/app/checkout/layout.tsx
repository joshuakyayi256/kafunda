import type { Metadata } from "next";
import { preconnect } from "react-dom";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order from Kafunda Wines & Spirits.",
  robots: { index: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  // Warm up the connection to Pesapal while the customer fills the form, so
  // the payment window opens without a cold DNS/TLS handshake.
  preconnect("https://pay.pesapal.com");
  return children;
}
