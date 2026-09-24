import type { Metadata } from "next";
import { Toaster } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Latch — public software repair market",
  description: "Fund a repair. Freeze the work order. Let the patch prove itself on GenLayer.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="top-rule"/><SiteHeader/><main>{children}</main><SiteFooter/><Toaster position="bottom-right" richColors/></body></html>;
}
