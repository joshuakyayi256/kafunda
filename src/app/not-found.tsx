import Link from "next/link";
import { MoveLeft, Wine } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-zinc-950 flex flex-center flex-col items-center justify-center p-4 text-center">
            <div className="relative mb-12">
                <div className="absolute inset-0 bg-primary-red/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <Wine className="w-24 h-24 text-primary-red relative z-10 animate-bounce" />
            </div>

            <h1 className="text-8xl md:text-9xl font-black text-white italic tracking-tighter mb-4 opacity-10 leading-none">404</h1>

            <div className="max-w-md">
                <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-6 leading-[0.9]">
                    The bottle is <br />
                    <span className="text-primary-red italic">Empty.</span>
                </h2>

                <p className="text-zinc-500 font-medium mb-10 leading-relaxed">
                    Looks like the vintage you're looking for doesn't exist or has been moved to a private cellar.
                </p>

                <Link
                    href="/"
                    className="inline-flex items-center gap-3 h-14 px-10 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg active:scale-95"
                >
                    <MoveLeft className="w-4 h-4" />
                    Return to Store
                </Link>
            </div>

            {/* Background Watermark */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-[0.03] select-none pointer-events-none">
                <span className="text-[20vw] font-black text-white italic uppercase leading-none">Kafunda</span>
            </div>
        </div>
    );
}
