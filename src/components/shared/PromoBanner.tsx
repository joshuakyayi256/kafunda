import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * PromoBanner — a soft, editorial promo strip placed between product shelves
 * on the homepage (matches the "Up to 30% off" banner the client liked).
 *
 * Cream card, organic blurred circles for warmth, a black eyebrow pill, a
 * two-line headline with one accent word in crimson, and a dark pill CTA.
 * Restrained — it punctuates the shelves without shouting.
 *
 * Reusable: pass different copy/href to place more than one down the page.
 */
interface PromoBannerProps {
  eyebrow?: string;
  /** Headline line 1 (plain). */
  line1: string;
  /** The accent fragment rendered in crimson (usually within line 1). */
  accent?: string;
  /** Headline line 2 (plain). */
  line2: string;
  ctaLabel: string;
  href: string;
}

export default function PromoBanner({
  eyebrow = "Limited Time",
  line1,
  accent,
  line2,
  ctaLabel,
  href,
}: PromoBannerProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="relative overflow-hidden rounded-3xl bg-kafunda-bone border border-kafunda-bone-soft px-8 py-10 md:px-14 md:py-14">
        {/* Organic accent shapes (decorative) */}
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-kafunda-green/10" />
        <div className="pointer-events-none absolute right-24 bottom-[-3rem] h-40 w-40 rounded-full bg-kafunda-mustard/20" />

        <div className="relative">
          <span className="inline-block bg-kafunda-ink text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-4">
            {eyebrow}
          </span>

          <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-[0.95] text-kafunda-ink max-w-2xl">
            {accent ? (
              <>
                {line1}{" "}
                <span className="text-kafunda-crimson">{accent}</span>
              </>
            ) : (
              line1
            )}
            <br />
            {line2}
          </h2>

          <Link
            href={href}
            className="inline-flex items-center gap-2 mt-7 bg-kafunda-ink hover:bg-kafunda-green text-white px-6 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-colors"
          >
            {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}