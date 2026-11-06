import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, CircleDollarSign, FileText, WalletCards } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const features = [
  { icon: ArrowDownRight, title: "See the full picture", copy: "Income, spending, and the balance between them—without a spreadsheet." },
  { icon: CircleDollarSign, title: "Make budgets that work", copy: "Set a limit for each category and know when you are getting close." },
  { icon: FileText, title: "Keep bills in view", copy: "Track due dates and recurring payments in one calm, clear place." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f6]">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="SpendFlow home"><Brand /></Link>
        <nav className="flex items-center gap-2 sm:gap-5" aria-label="Account">
          <Link href="/login" className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold text-[#53605c] hover:text-[#172321] sm:px-3">Log in</Link>
          <Link href="/signup" className="button button-small whitespace-nowrap sm:min-h-[42px] sm:px-4">Get started <ChevronRight size={15} /></Link>
        </nav>
      </header>
      <section className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-20 pt-10 sm:px-8 md:grid-cols-[1.05fr_.95fr] md:gap-16 md:pb-28 md:pt-20">
        <div className="page-enter">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e5eae7] bg-white px-3 py-1.5 text-xs font-semibold text-[#53605c]">
            <span className="size-2 rounded-full bg-[#1c8b69]" />A clearer view of everyday money
          </span>
          <h1 className="hero-title display mt-7 max-w-[620px] text-[50px] leading-[1.05] sm:text-[64px] lg:text-[72px]">
            Know where it went. <span className="text-[#265be8]">Choose what comes next.</span>
          </h1>
          <p className="mt-6 max-w-[490px] text-base leading-7 text-[#65716d]">
            SpendFlow brings your spending, budgets, and bills together—so the small decisions feel a little less uncertain.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild className="min-h-12 px-5"><Link href="/signup">Create your free account <ChevronRight size={16} /></Link></Button>
            <span className="flex items-center gap-1.5 text-xs text-[#65716d]"><Check size={14} className="text-[#1c8b69]" />Private by design</span>
          </div>
          <p className="mt-9 text-xs text-[#65716d]">Built for real life, from your first expense onward.</p>
        </div>
        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -right-7 -top-7 size-32 rounded-full bg-[#f4c84a]/45 blur-2xl" />
          <div className="absolute -bottom-12 -left-7 size-36 rounded-full bg-[#265be8]/10 blur-2xl" />
          <div className="panel relative overflow-hidden p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-[#edf0ee] pb-5">
              <div className="flex items-center gap-3"><Brand compact /><span><b className="block text-sm">Your money, in focus</b><span className="text-xs text-[#65716d]">A simpler daily picture</span></span></div>
              <span className="rounded-full bg-[#edf2ff] px-3 py-1.5 text-[11px] font-semibold text-[#265be8]">Overview</span>
            </div>
            <div className="grid gap-3 py-5 min-[420px]:grid-cols-2">
              <div className="rounded-xl bg-[#f7f8f6] p-4">
                <span className="text-xs text-[#65716d]">Income this month</span>
                <p className="display mt-3 text-[26px]">A little more clarity</p>
                <span className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#25704f]"><ArrowUpRight size={13} />Track what comes in</span>
              </div>
              <div className="rounded-xl bg-[#edf2ff] p-4">
                <span className="text-xs text-[#526aa0]">Spending by category</span>
                <div className="mt-5 grid grid-cols-[68px_1fr] items-center gap-4">
                  <div className="grid size-[68px] place-items-center rounded-full border-[9px] border-[#265be8] border-r-[#f4c84a] border-b-[#cbd7fb]"><WalletCards size={19} className="text-[#265be8]" /></div>
                  <div className="grid gap-2 text-[10px] text-[#526aa0]"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#265be8]" />Everyday</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#f4c84a]" />Home</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#cbd7fb]" />Everything else</span></div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#edf0ee] p-4">
              <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold">Your monthly rhythm</span><span className="text-xs text-[#65716d]">Income and spending</span></div>
              <div className="flex h-[106px] items-end justify-around gap-2 border-b border-[#edf0ee] px-2">
                {[44, 66, 50, 79, 60, 91, 70, 56, 76, 48, 65, 87].map((height, index) => (
                  <div key={index} className="flex h-full flex-1 items-end gap-[3px]">
                    <span className="w-full rounded-t-sm bg-[#265be8]" style={{ height: `${height}%` }} />
                    <span className="w-full rounded-t-sm bg-[#f4c84a]" style={{ height: `${Math.max(16, 94 - height)}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-[#65716d]"><span>Income</span><span className="ml-auto mr-4 size-2 rounded-sm bg-[#265be8]" /><span>Spending</span><span className="ml-1 size-2 rounded-sm bg-[#f4c84a]" /></div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#172321] px-4 py-3 text-white">
              <span className="flex items-center gap-2 text-xs"><FileText size={15} className="text-[#f4c84a]" />Bills and due dates, together</span>
              <ArrowDownRight size={15} className="text-[#b8c5c0]" />
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-[#e5eae7] bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 md:py-16">
          <div className="mb-8 max-w-[550px]">
            <h2 className="display mt-3 text-3xl sm:text-[40px]">A steadier way to stay on top of it.</h2>
          </div>
          <div className="grid gap-7 md:grid-cols-3">
            {features.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="border-t border-[#e5eae7] pt-5">
                <span className="grid size-10 place-items-center rounded-xl bg-[#edf2ff] text-[#265be8]"><Icon size={18} /></span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 max-w-[320px] text-sm leading-6 text-[#65716d]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-[#65716d] sm:px-8">
        <Brand /><span>Built for your real life, not someone else’s numbers.</span>
      </footer>
    </main>
  );
}
