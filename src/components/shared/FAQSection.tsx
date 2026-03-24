"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import faqs from "@/data/faqs.json";

const FAQSection = () => {
    const [openIdx, setOpenIdx] = useState<number | null>(null);

    const toggle = (idx: number) => {
        setOpenIdx(openIdx === idx ? null : idx);
    };

    return (
        <section className="py-20 bg-secondary-gray">
            <div className="max-w-3xl mx-auto px-4">
                <h2 className="text-3xl font-black text-center mb-12 uppercase tracking-tighter">
                    Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                    {faqs.map((faq, idx) => (
                        <div
                            key={idx}
                            className="bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm"
                        >
                            <button
                                onClick={() => toggle(idx)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                                aria-expanded={openIdx === idx}
                            >
                                <span className="font-bold text-zinc-900 leading-tight">
                                    {faq.question}
                                </span>
                                {openIdx === idx ? (
                                    <ChevronUp className="h-5 w-5 text-primary-red flex-shrink-0" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                )}
                            </button>
                            {openIdx === idx && (
                                <div className="px-6 pb-6 pt-0 text-zinc-600 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <p>{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQSection;
