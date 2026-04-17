import type { Metadata } from "next";
import Link from "next/link";
import { Truck, Clock, MapPin, ArrowRight, ShieldCheck, RotateCcw } from "lucide-react";

export const metadata: Metadata = {
  title: "Delivery Policy",
  description:
    "Kafunda Wines & Spirits delivery information — areas covered, fees, timing, and our returns policy.",
  openGraph: {
    title: "Delivery Policy | Kafunda Wines & Spirits",
    description: "Delivery areas, fees, timing, and returns information.",
  },
};

const deliveryAreas = [
  "Kololo", "Nakasero", "Bukoto", "Ntinda", "Muyenga",
  "Bugolobi", "Naguru", "Kisementi", "Mulago", "Kampala CBD",
  "Mengo", "Rubaga", "Namirembe", "Kabalagala", "Kansanga",
];

const faqs = [
  {
    q: "What is the delivery fee?",
    a: "Delivery is UGX 5,000 flat across all covered areas. Orders above UGX 500,000 qualify for free delivery.",
  },
  {
    q: "How long does delivery take?",
    a: "1–2 hours within Kampala from the time of confirmed payment. During peak hours or bad traffic, it may extend slightly — our team will keep you posted.",
  },
  {
    q: "Do you deliver at night?",
    a: "Yes. We deliver until 10 pm Sunday through Thursday, and until midnight on Fridays and Saturdays.",
  },
  {
    q: "Can I change my delivery address after ordering?",
    a: "Contact us immediately on WhatsApp (+256 785 498 279) before your order is dispatched and we'll update it.",
  },
  {
    q: "What if I'm not available at delivery time?",
    a: "Our rider will call you before arriving. If you miss the call and cannot be reached, the order will be returned and we'll arrange a new delivery time.",
  },
];

export default function DeliveryPage() {
  return (
    <main className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-zinc-950 py-20 md:py-28 text-center px-4">
        <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-4">
          Delivery
        </p>
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9]">
          Fast. Reliable.<br />
          <span className="text-primary-red">On time.</span>
        </h1>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">

        {/* Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Clock, title: "1–2 Hour Delivery", body: "From order confirmation to your door." },
            { icon: Truck, title: "UGX 5,000 Fee", body: "Free on orders over UGX 500,000." },
            { icon: MapPin, title: "Kampala-Wide", body: "All major areas in and around Kampala." },
          ].map((item) => (
            <div key={item.title} className="bg-zinc-50 border border-gray-100 rounded-2xl p-6">
              <item.icon className="h-6 w-6 text-primary-red mb-4" />
              <h3 className="font-black text-zinc-900 uppercase tracking-wider text-sm mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-500">{item.body}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <section>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">How It Works</h2>
          <ol className="space-y-6">
            {[
              { step: "01", title: "Place your order", body: "Add items to your cart and checkout online, or message us directly on WhatsApp." },
              { step: "02", title: "We confirm & pack", body: "Our team reviews your order, packs it carefully, and assigns a rider." },
              { step: "03", title: "Rider on the way", body: "You receive a call from the rider before they arrive at your location." },
              { step: "04", title: "Delivered to you", body: "Pay on delivery (cash or mobile money) and enjoy your drinks." },
            ].map((item) => (
              <li key={item.step} className="flex gap-6 items-start">
                <span className="text-3xl font-black text-gray-100 leading-none shrink-0 w-10">{item.step}</span>
                <div>
                  <h3 className="font-black text-zinc-900 uppercase tracking-wider text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-zinc-500 font-medium">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Areas */}
        <section>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">Covered Areas</h2>
          <p className="text-zinc-500 text-sm mb-6 font-medium">
            We currently deliver to the following areas in Kampala. Don't see yours?{" "}
            <Link href="/contact" className="text-primary-red font-bold hover:underline">Contact us</Link> — we'll do our best.
          </p>
          <div className="flex flex-wrap gap-2">
            {deliveryAreas.map((area) => (
              <span
                key={area}
                className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-xs font-bold uppercase tracking-widest text-zinc-700"
              >
                {area}
              </span>
            ))}
          </div>
        </section>

        {/* Returns */}
        <section className="bg-zinc-50 border border-gray-100 rounded-2xl p-8">
          <div className="flex items-start gap-4 mb-6">
            <RotateCcw className="h-6 w-6 text-primary-red shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter mb-2">Returns & Refunds</h2>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                We accept returns within <strong className="text-zinc-900">24 hours</strong> of delivery if the seal is unbroken
                and the product is in its original condition. Damaged or incorrect items are replaced
                immediately — just send us a photo on WhatsApp. Once a bottle has been opened, we cannot
                accept a return.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-zinc-400 uppercase tracking-widest">
            <ShieldCheck className="h-4 w-4 text-success-green" />
            All products are quality-checked before dispatch.
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">Common Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-gray-100 pb-6">
                <h3 className="font-black text-zinc-900 text-sm uppercase tracking-wider mb-2">{faq.q}</h3>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/shop"
            className="inline-flex items-center bg-primary-red hover:bg-primary-red-hover text-white px-10 py-4 text-sm font-bold tracking-widest uppercase transition-all rounded-full shadow-lg"
          >
            Start Shopping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
