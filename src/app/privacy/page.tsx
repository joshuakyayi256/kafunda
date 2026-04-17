import React from "react";
import { ShieldCheck, Lock, Eye, FileText } from "lucide-react";
import { SITE } from "@/lib/constants";

export const metadata = {
    title: "Privacy Policy | Kafunda Wines & Spirits",
    description: "Learn how Kafunda Wines & Spirits handles and protects your data.",
};

export default function PrivacyPolicy() {
    return (
        <main className="bg-white min-h-screen pt-32 pb-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-16 text-center">
                    <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 leading-none">
                        Privacy <span className="text-primary-red italic">Policy</span>
                    </h1>
                    <p className="text-zinc-500 font-medium uppercase tracking-[0.2em] text-xs">
                        Last Updated: April 17, 2026
                    </p>
                </div>

                {/* Content */}
                <div className="prose prose-zinc lg:prose-lg max-w-none">
                    <section className="mb-12">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-zinc-950" />
                            </div>
                            Introduction
                        </h2>
                        <p className="text-zinc-600 leading-relaxed font-medium">
                            At {SITE.name}, your privacy is paramount. This policy outlines how we collect, use, and safeguard your personal information when you use our website and services. By accessing our store, you agree to the practices described here.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                                <Eye className="w-4 h-4 text-zinc-950" />
                            </div>
                            Information We Collect
                        </h2>
                        <p className="text-zinc-600 leading-relaxed font-medium mb-4">
                            We collect information that helps us provide a premium shopping experience:
                        </p>
                        <ul className="list-none space-y-4 p-0">
                            {[
                                { label: "Personal Details", value: "Name, email address, phone number, and delivery address." },
                                { label: "Order History", value: "Details of products purchased and transaction records." },
                                { label: "Usage Data", value: "IP address, browser type, and interaction with our website." }
                            ].map((item) => (
                                <li key={item.label} className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                                    <span className="block text-zinc-950 font-black uppercase text-xs tracking-widest mb-1">{item.label}</span>
                                    <span className="text-zinc-600 text-sm font-medium">{item.value}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                                <Lock className="w-4 h-4 text-zinc-950" />
                            </div>
                            How We Use Your Data
                        </h2>
                        <p className="text-zinc-600 leading-relaxed font-medium">
                            Your data is used strictly for:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-zinc-600 font-medium">
                            <li>Processing and delivering your orders.</li>
                            <li>Communicating order updates and promotional offers.</li>
                            <li>Improving our website performance and selection.</li>
                            <li>Preventing fraudulent transactions.</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-zinc-950" />
                            </div>
                            Data Security
                        </h2>
                        <p className="text-zinc-600 leading-relaxed font-medium">
                            We implement robust security measures to protect your data. Transactional information is encrypted using Secure Socket Layer (SSL) technology. We never store full credit card details on our servers.
                        </p>
                    </section>

                    <section className="bg-zinc-950 rounded-[2.5rem] p-10 md:p-16 text-white text-center">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-6">Questions about your privacy?</h2>
                        <p className="text-zinc-400 mb-10 max-w-md mx-auto font-medium">
                            If you have any questions regarding this policy or how your data is handled, please contact our support team.
                        </p>
                        <a
                            href={`mailto:${SITE.email}`}
                            className="inline-flex items-center h-14 px-10 bg-white text-zinc-950 text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary-red hover:text-white transition-all active:scale-95"
                        >
                            Contact Support
                        </a>
                    </section>
                </div>
            </div>
        </main>
    );
}
