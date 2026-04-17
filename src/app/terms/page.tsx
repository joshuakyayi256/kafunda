import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Kafunda Wines & Spirits terms of service — including age verification, ordering, delivery, and responsible consumption policies.",
};

const sections = [
  {
    title: "1. Age Verification",
    body: `You must be 18 years of age or older to purchase any products from Kafunda Wines & Spirits. By placing an order, you confirm that you are of legal drinking age in Uganda. We reserve the right to request valid government-issued photo ID upon delivery and to refuse delivery if age cannot be verified. Placing an order on behalf of a minor is strictly prohibited.`,
  },
  {
    title: "2. Ordering",
    body: `All orders are subject to product availability. Prices are displayed in Ugandan Shillings (UGX) and are inclusive of applicable taxes. We reserve the right to cancel any order at our discretion — in such cases, you will be notified promptly and no payment will be processed. We do not guarantee that any specific product will be in stock at the time of your order.`,
  },
  {
    title: "3. Payment",
    body: `We currently accept Cash on Delivery and Mobile Money (MTN MoMo and Airtel Money). Payment is due at the time of delivery. For Mobile Money orders, our agent will initiate a payment prompt to your number before dispatch. Orders are only packed and dispatched once payment is confirmed for Mobile Money transactions.`,
  },
  {
    title: "4. Delivery",
    body: `Delivery is available across Kampala. Estimated delivery time is 1–2 hours from confirmation. Kafunda Wines & Spirits is not liable for delays caused by traffic, weather, or circumstances beyond our control. You are responsible for providing an accurate delivery address. If you cannot be reached at the time of delivery, the order will be returned and a new delivery time will be arranged.`,
  },
  {
    title: "5. Returns & Refunds",
    body: `Returns are accepted within 24 hours of delivery for products with unbroken seals and in their original condition. If you receive a damaged, incorrect, or substandard product, contact us immediately via WhatsApp (+256 700 000 000) with a photograph. We will replace or refund the item at our discretion. Once a bottle has been opened, no return or refund will be processed.`,
  },
  {
    title: "6. Responsible Consumption",
    body: `Kafunda Wines & Spirits promotes responsible alcohol consumption. We will not sell to anyone who appears to be intoxicated at the time of delivery. Please drink responsibly. Do not drink and drive. If you or someone you know needs help with alcohol dependency, please seek professional advice.`,
  },
  {
    title: "7. Intellectual Property",
    body: `All content on this website — including logos, product imagery, copy, and design — is the property of Kafunda Wines & Spirits or its licensors. Unauthorised reproduction, distribution, or use of any content is prohibited without prior written consent.`,
  },
  {
    title: "8. Privacy",
    body: `We collect your name, phone number, email address, and delivery address solely for the purpose of processing and delivering your order. We do not sell or share your personal data with third parties. Your data is stored securely and you may request deletion at any time by contacting us at info@kafundawines.com.`,
  },
  {
    title: "9. Limitation of Liability",
    body: `Kafunda Wines & Spirits shall not be liable for any indirect, incidental, or consequential loss arising from the use of this website or any products purchased from us. Our maximum liability in any dispute is limited to the value of the order in question.`,
  },
  {
    title: "10. Changes to These Terms",
    body: `We reserve the right to update these terms at any time. The most current version will always be available on this page. Continued use of our website and services following any change constitutes your acceptance of the revised terms.`,
  },
];

export default function TermsPage() {
  return (
    <main className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-zinc-950 py-16 md:py-24 text-center px-4">
        <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-4">
          Legal
        </p>
        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-[0.9]">
          Terms &<br />
          <span className="text-primary-red">Conditions</span>
        </h1>
        <p className="text-zinc-500 mt-6 text-sm font-medium">
          Last updated: April 2026
        </p>
      </section>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <p className="text-zinc-500 font-medium leading-relaxed border-l-2 border-primary-red pl-4">
          Please read these terms carefully before using our website or placing an order.
          By accessing kafundawines.com or placing an order, you agree to be bound by these terms.
        </p>

        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-base font-black uppercase tracking-widest text-zinc-900 mb-3">
              {s.title}
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed font-medium">{s.body}</p>
          </section>
        ))}

        <div className="pt-8 border-t border-gray-100 text-sm text-zinc-500 font-medium">
          Questions about these terms?{" "}
          <Link href="/contact" className="text-primary-red font-bold hover:underline">
            Contact us
          </Link>{" "}
          and we'll be happy to explain.
        </div>
      </div>
    </main>
  );
}
