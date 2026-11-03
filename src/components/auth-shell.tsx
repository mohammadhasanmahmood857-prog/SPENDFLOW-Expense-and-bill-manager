import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";

// Shared frame for the sign-in pages. Desktop: brand panel left, form right.
// Phone: a compact brand band so the form starts on the first screen.
export function AuthShell({
  title,
  tagline,
  footnote,
  children,
}: {
  title: string;
  tagline: string;
  footnote: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr] bg-white md:grid-cols-[minmax(320px,.85fr)_1.15fr] md:grid-rows-1">
      <section className="flex flex-col justify-between bg-[#172321] px-5 py-6 text-white sm:p-10 md:p-12">
        <Link href="/" aria-label="SpendFlow home" className="self-start"><Brand /></Link>
        <div className="mt-6 max-w-[460px] md:my-12">
          <h1 className="display text-[28px] leading-tight sm:text-4xl md:mt-5 md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-[370px] text-sm leading-6 text-[#b8c5c0] md:mt-5">{tagline}</p>
        </div>
        <p className="hidden text-xs text-[#9cafaa] md:block">{footnote}</p>
      </section>
      <section className="grid content-start justify-items-center px-5 pb-12 pt-8 sm:px-10 md:content-center md:py-12">
        <div className="w-full max-w-[390px]">{children}</div>
      </section>
    </main>
  );
}
