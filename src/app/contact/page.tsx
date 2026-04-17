import type { Metadata } from "next";
import { MapPin, Phone, Mail, MessageCircle, Clock } from "lucide-react";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Kafunda Wines & Spirits. Reach us via WhatsApp, phone, or email — or visit us on Mpererwe, Lusanja-Kiteezi Road, Kampala.",
  openGraph: {
    title: "Contact Us | Kafunda Wines & Spirits",
    description: "Reach us via WhatsApp, phone, or email.",
  },
};

const contactItems = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: CONTACT.phone,
    sub: "Fastest response — usually within minutes.",
    href: CONTACT.whatsapp,
    cta: "Chat Now",
    color: "bg-emerald-500 hover:bg-emerald-600",
  },
  {
    icon: Phone,
    label: "Phone",
    value: CONTACT.phone,
    sub: "Available Mon–Sat, 9 am – 10 pm.",
    href: `tel:${CONTACT.phoneDial}`,
    cta: "Call Us",
    color: "bg-primary-red hover:bg-primary-red-hover",
  },
  {
    icon: Mail,
    label: "Email",
    value: CONTACT.email,
    sub: "We respond within 24 hours.",
    href: `mailto:${CONTACT.email}`,
    cta: "Send Email",
    color: "bg-zinc-900 hover:bg-zinc-800",
  },
];

export default function ContactPage() {
  return (
    <main className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-zinc-950 py-20 md:py-28 text-center px-4">
        <p className="text-[10px] font-bold text-primary-red uppercase tracking-[0.3em] mb-4">
          Get In Touch
        </p>
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9]">
          We&apos;re here<br />
          <span className="text-primary-red">to help.</span>
        </h1>
        <p className="text-zinc-400 mt-6 max-w-lg mx-auto font-medium">
          Questions about your order? Need a recommendation? Want to place a bulk order?
          Reach out and we&apos;ll get back to you right away.
        </p>
      </section>

      {/* Contact Cards */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {contactItems.map((item) => (
            <div
              key={item.label}
              className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow flex flex-col"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-5">
                <item.icon className="h-5 w-5 text-primary-red" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                {item.label}
              </p>
              <p className="text-lg font-black text-zinc-900 mb-2">{item.value}</p>
              <p className="text-sm text-zinc-500 font-medium mb-6 grow">{item.sub}</p>
              <a
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={`${item.color} text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-xl transition-colors text-center`}
              >
                {item.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Info Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-zinc-50 rounded-2xl p-8 border border-gray-100">
          <div className="flex items-start gap-4">
            <MapPin className="h-5 w-5 text-primary-red shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-900 mb-1">Location</p>
              <p className="text-sm text-zinc-500">{CONTACT.address}<br />{CONTACT.city}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Clock className="h-5 w-5 text-primary-red shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-900 mb-1">Hours</p>
              <p className="text-sm text-zinc-500">{CONTACT.hours.weekday}<br />{CONTACT.hours.weekend}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MessageCircle className="h-5 w-5 text-primary-red shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-900 mb-1">Fastest Way</p>
              <p className="text-sm text-zinc-500">WhatsApp us — we usually reply within minutes during business hours.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
