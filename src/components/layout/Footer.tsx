import React from "react";
import Link from "next/link";
import {
    Camera,
    Send,
    Globe,
    MessageCircle,
    MapPin,
    Phone,
    Mail
} from "lucide-react";

const Footer = () => {
    const socialIcons = [
        { Icon: MessageCircle, label: "Facebook" },
        { Icon: Send, label: "Twitter" },
        { Icon: Camera, label: "Instagram" },
        { Icon: Globe, label: "LinkedIn" }
    ];
    return (
        <footer className="bg-black text-white pt-24 pb-12 px-4 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-24">
                    {/* Brand & Socials Section */}
                    <div>
                        <div className="flex items-center space-x-2 mb-6">
                            <div className="bg-primary-red p-1.5 rounded-lg">
                                <span className="text-white font-black">K</span>
                            </div>
                            <span className="text-2xl font-black tracking-tighter uppercase italic">Kafunda</span>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed mb-8 max-w-sm">
                            Uganda&apos;s premier destination for curated wines and spirits.
                            Delivered in seconds, enjoyed for hours. Experience the art
                            of fine drinking.
                        </p>
                        <div className="flex space-x-4">
                            {socialIcons.map(({ Icon, label }, idx) => (
                                <a
                                    key={idx}
                                    href="#"
                                    aria-label={label}
                                    className="h-10 w-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:bg-primary-red hover:text-white transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
                                >
                                    <Icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Shop Section */}
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-widest mb-8 border-b border-zinc-900 pb-4 inline-block">
                            Shop
                        </h4>
                        <ul className="space-y-4">
                            {["Wines", "Whiskies", "Gins", "Champagnes", "How it Works", "Our Story"].map((item) => (
                                <li key={item}>
                                    <Link
                                        href="/shop"
                                        className="text-zinc-500 hover:text-white text-sm transition-colors duration-200 block border-l-2 border-transparent hover:border-primary-red hover:pl-4"
                                    >
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Section */}
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-widest mb-8 border-b border-zinc-900 pb-4 inline-block">
                            Contact
                        </h4>
                        <ul className="space-y-6">
                            <li className="flex items-start group">
                                <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center mr-4 group-hover:bg-primary-red/10 transition-colors">
                                    <MapPin className="h-4 w-4 text-primary-red" />
                                </div>
                                <div>
                                    <p className="text-zinc-500 text-sm">Kampala, Uganda</p>
                                    <p className="text-zinc-600 text-[10px] uppercase font-bold mt-1">Plot 45, Acacia Avenue</p>
                                </div>
                            </li>
                            <li className="flex items-center group">
                                <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center mr-4 group-hover:bg-primary-red/10 transition-colors">
                                    <Phone className="h-4 w-4 text-primary-red" />
                                </div>
                                <p className="text-zinc-500 text-sm hover:text-white transition-colors cursor-pointer tracking-wider">
                                    +256 700 000 000
                                </p>
                            </li>
                            <li className="flex items-center group">
                                <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center mr-4 group-hover:bg-primary-red/10 transition-colors">
                                    <Mail className="h-4 w-4 text-primary-red" />
                                </div>
                                <p className="text-zinc-500 text-sm hover:text-white transition-colors cursor-pointer">
                                    info@kafunda.com
                                </p>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-12 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
                    <p>© {new Date().getFullYear()} Kafunda Spirits. All rights reserved.</p>
                    <div className="flex space-x-8 mt-6 md:mt-0">
                        <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="#" className="hover:text-white transition-colors">Sitemap</Link>
                    </div>
                </div>
            </div>

            {/* Giant Background Watermark Text */}
            <div className="absolute -bottom-10 left-0 w-full flex justify-center translate-y-1/2 select-none pointer-events-none opacity-5">
                <span className="text-[15vw] md:text-[20vw] font-black text-white leading-none tracking-tighter uppercase italic">
                    Kafunda
                </span>
            </div>
        </footer>
    );
};

export default Footer;
