"use client";

import React from "react";
import { ShieldCheck, Truck, RefreshCw, Award } from "lucide-react";

const TrustBadges = ({ centered = true }: { centered?: boolean }) => {
    const badges = [
        {
            icon: <Award className="h-6 w-6 text-success-green" />,
            title: "Verified Age 21+",
            description: "Mandatory age verification"
        },
        {
            icon: <Truck className="h-6 w-6 text-success-green" />,
            title: "Fast Delivery",
            description: "1-2 hour express shipping"
        },
        {
            icon: <ShieldCheck className="h-6 w-6 text-success-green" />,
            title: "Secure Payment",
            description: "Fully encrypted checkout"
        },
        {
            icon: <RefreshCw className="h-6 w-6 text-success-green" />,
            title: "Easy Returns",
            description: "Hassle-free guarantee"
        }
    ];

    return (
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-8 py-10 ${centered ? "text-center" : ""}`}>
            {badges.map((badge, idx) => (
                <div key={idx} className="flex flex-col items-center">
                    <div className="mb-3 p-3 bg-emerald-50 rounded-full">
                        {badge.icon}
                    </div>
                    <h4 className="text-zinc-900 font-bold text-sm uppercase tracking-wider mb-1">
                        {badge.title}
                    </h4>
                    <p className="text-zinc-500 text-xs">
                        {badge.description}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default TrustBadges;
