"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import faqs from "@/data/faqs.json";

const FAQSection = () => {
    const [openIdx, setOpenIdx] = useState<number | null>(null);

    const toggle = (idx: number) => {
        setOpenIdx(openIdx === idx ? null : idx);
    };

    return (
        <section className="py-24 bg-white relative overflow-hidden">
            {/* Background Text Watermark */}
            <div className="absolute top-10 right-0 opacity-[0.02] select-none pointer-events-none">
                <span className="text-[15vw] font-black text-zinc-950 uppercase italic tracking-tighter">Support</span>
            </div>

            <div className="max-w-4xl mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <p className="text-[10px] font-black text-primary-red uppercase tracking-[0.3em] mb-3">Help Center</p>
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4">
                        Common <span className="text-primary-red italic">Questions</span>
                    </h2>
                    <p className="text-zinc-500 font-medium text-sm md:text-base max-w-xl mx-auto">
                        Everything you need to know about our delivery, payments, and premium collection.
                    </p>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, idx) => (
                        <div
                            key={idx}
                            className={`rounded-[2rem] overflow-hidden transition-all duration-300 border ${openIdx === idx
                                ? "bg-zinc-950 border-zinc-900 shadow-2xl"
                                : "bg-zinc-50 border-zinc-100 hover:border-zinc-200"
                                }`}
                        >
                            <button
                                onClick={() => toggle(idx)}
                                className="w-full flex items-center justify-between p-6 md:p-8 text-left transition-colors"
                                aria-expanded={openIdx === idx}
                            >
                                <span className={`font-black text-sm md:text-base uppercase tracking-tight ${openIdx === idx ? "text-white" : "text-zinc-900"
                                    }`}>
                                    {faq.question}
                                </span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${openIdx === idx ? "bg-primary-red text-white rotate-180" : "bg-zinc-200 text-zinc-500"
                                    }`}>
                                    <ChevronDown className="h-4 w-4" />
                                </div>
                            </button>
                            {openIdx === idx && (
                                <div className="px-6 md:px-8 pb-6 md:pb-8 pt-0 text-zinc-400 animate-in fade-in zoom-in-95 duration-500">
                                    <p className="text-sm md:text-base leading-relaxed font-medium">{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Still have questions? */}
                <div className="mt-16 p-8 rounded-[2.5rem] bg-zinc-50 border border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-red rounded-2xl flex items-center justify-center text-white shrink-0">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-black text-zinc-900 uppercase text-sm tracking-tight">Still have questions?</h4>
                            <p className="text-zinc-500 text-xs font-medium">We&apos;re here to help you choose the perfect drink.</p>
                        </div>
                    </div>
                    <a href="https://wa.me/256785498279" target="_blank" className="h-12 px-8 bg-zinc-950 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-red transition-all flex items-center">
                        Chat with Us
                    </a>
                </div>
            </div>
        </section>
    );
};

export default FAQSection;
