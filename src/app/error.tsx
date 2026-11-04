"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, Wine } from "lucide-react";

/**
 * Branded fallback for any server/render error below the root layout
 * (e.g. the catalogue being unreachable on a product page). Without this,
 * customers get Next's bare "This page couldn't load" screen.
 */
export default function Error({
    error,
    unstable_retry,
}: {
    error: Error & { digest?: string };
    unstable_retry: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
            <Wine className="w-16 h-16 text-primary-red mb-8" />

            <div className="max-w-md">
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4 leading-[0.9]">
                    We&apos;re topping up <br />
                    <span className="text-primary-red italic">the shelves.</span>
                </h2>

                <p className="text-zinc-500 font-medium mb-8 leading-relaxed">
                    Something went wrong loading this page. Please try again in a moment,
                    or order straight away on WhatsApp.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => unstable_retry()}
                        className="inline-flex items-center justify-center gap-3 h-12 px-8 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg active:scale-95"
                    >
                        <RotateCw className="w-4 h-4" />
                        Try again
                    </button>
                    <a
                        href="https://wa.me/256785498279"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-colors"
                    >
                        Order on WhatsApp
                    </a>
                </div>

                <Link href="/" className="inline-block mt-6 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-primary-red">
                    Return to store
                </Link>

                {error.digest && (
                    <p className="mt-8 text-[10px] font-mono text-zinc-300">Ref {error.digest}</p>
                )}
            </div>
        </div>
    );
}
