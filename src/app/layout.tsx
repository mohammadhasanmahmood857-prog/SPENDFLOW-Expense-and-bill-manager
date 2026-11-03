import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SpendFlow — your money, in focus",
    template: "%s · SpendFlow",
  },
  description: "A thoughtful place to track everyday spending, budgets, and bills.",
  openGraph: {
    type: "website",
    siteName: "SpendFlow",
    title: "SpendFlow — your money, in focus",
    description: "A thoughtful place to track everyday spending, budgets, and bills.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
