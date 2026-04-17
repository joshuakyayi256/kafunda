import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Kafunda Wines & Spirits — Uganda's premier destination for curated wines, whiskies, and spirits delivered across Kampala.",
  openGraph: {
    title: "About Us | Kafunda Wines & Spirits",
    description:
      "Uganda's premier destination for curated wines, whiskies, and spirits delivered across Kampala.",
  },
};

const values = [
  {
    title: "Curated Selection",
    body:
      "Every bottle in our catalogue is hand-picked. If it doesn't meet our standard, it doesn't make the shelf.",
  },
  {
    title: "1–2 Hour Delivery",
    body:
      "We deliver across Kampala fast. Order by midnight and your drinks arrive before the night is over.",
  },
  {
    title: "Fair Pricing",
    body:
      "No hidden fees. What you see is what you pay — including free delivery on orders over UGX 500,000.",
  },
  {
    title: "Responsible Service",
    body:
      "We sell to adults only and promote responsible enjoyment. Every order requires age verification.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center bg-zinc-950 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2000"
          alt="Wine cellar"
          fill
          priority
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-transparent" />
        <div className="relative z-10 text-center px-4 max-w-3xl">
          <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-4">
            Our Story
          </p>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9]">
            Born in<br />
            <span className="text-primary-red">Kampala.</span><br />
            Built for it.
          </h1>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-4">
              Who We Are
            </p>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[0.95] mb-6">
              Uganda's Premier<br />
              <span className="text-primary-red">Liquor Destination</span>
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-4 font-medium">
              Kafunda Wines & Spirits was built on a simple belief: that access to great drinks
              shouldn't require a trip across town. Whether you're hosting a dinner party,
              celebrating a milestone, or winding down after a long week — premium shouldn't
              mean complicated.
            </p>
            <p className="text-zinc-600 leading-relaxed mb-8 font-medium">
              We stock over 500 products spanning fine wines, rare whiskies, craft gins, champagnes,
              and everything in between. Our team personally sources and curates every bottle,
              so you can order with confidence.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center bg-primary-red hover:bg-primary-red-hover text-white px-8 py-4 text-sm font-bold tracking-widest uppercase transition-all rounded-full shadow-lg"
            >
              Browse Our Collection
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-100">
            <Image
              src="https://images.unsplash.com/photo-1474722883778-792e7990302f?q=80&w=1000"
              alt="Premium wine bottles"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-4">
              What We Stand For
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">
              Our Values
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v) => (
              <div
                key={v.title}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-primary-red/50 transition-colors"
              >
                <div className="w-8 h-1 bg-primary-red rounded-full mb-4" />
                <h3 className="text-white font-black uppercase tracking-wider text-sm mb-3">
                  {v.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 text-center px-4">
        <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-4">
          Ready?
        </p>
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6">
          Let's pour you something<br />
          <span className="text-primary-red">special.</span>
        </h2>
        <Link
          href="/shop"
          className="inline-flex items-center bg-black hover:bg-zinc-800 text-white px-10 py-4 text-sm font-bold tracking-widest uppercase transition-all rounded-full shadow-xl"
        >
          Shop Now
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
