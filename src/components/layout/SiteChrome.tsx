"use client";

/** Renders the shop's header/footer/popups everywhere except the /marketing dashboard. */
import { usePathname } from "next/navigation";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/marketing")) return null;
  return <>{children}</>;
}
