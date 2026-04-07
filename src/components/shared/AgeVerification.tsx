"use client";

import React, { useEffect, useState } from "react";

const AgeVerification = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isRejected, setIsRejected] = useState(false);

    useEffect(() => {
        // Check local storage after component mounts to prevent hydration errors
        const isVerified = localStorage.getItem("kafunda_age_verified");
        if (!isVerified) {
            // Defer state update to avoid synchronous cascade error
            setTimeout(() => {
                setIsVisible(true);
                // Prevent scrolling while modal is open
                document.body.style.overflow = "hidden";
            }, 0);
        }
    }, []);

    const handleVerify = () => {
        localStorage.setItem("kafunda_age_verified", "true");
        setIsVisible(false);
        document.body.style.overflow = "unset";
    };

    const handleReject = () => {
        setIsRejected(true);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
            <div className="bg-white rounded-xl max-w-md w-full p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
                
                {/* Background Watermark */}
                <div className="absolute -bottom-10 left-0 w-full flex justify-center select-none pointer-events-none opacity-5">
                    <span className="text-[120px] font-black text-black leading-none tracking-tighter uppercase italic">
                        K
                    </span>
                </div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">
                        Are you of legal drinking age?
                    </h2>
                    <p className="text-zinc-500 font-medium text-sm mb-8">
                        You must be 18 years of age or older to enter this site and purchase alcohol in Uganda.
                    </p>

                    {isRejected ? (
                        <div className="bg-red-50 text-primary-red p-4 rounded-lg font-bold text-sm uppercase tracking-widest animate-in fade-in zoom-in duration-300">
                            Sorry, you must be 18+ to enter.
                        </div>
                    ) : (
                        <div className="flex flex-col space-y-3">
                            <button
                                onClick={handleVerify}
                                className="w-full bg-primary-red hover:bg-primary-red-hover text-white py-4 font-bold text-sm tracking-widest uppercase transition-all transform active:scale-[0.98] shadow-lg"
                            >
                                Yes, I am 18 or older
                            </button>
                            <button
                                onClick={handleReject}
                                className="w-full bg-secondary-gray hover:bg-gray-200 text-zinc-900 py-4 font-bold text-sm tracking-widest uppercase transition-all"
                            >
                                No, I am under 18
                            </button>
                        </div>
                    )}

                    <p className="text-[10px] text-gray-400 mt-8 uppercase tracking-widest font-bold">
                        By entering, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AgeVerification;