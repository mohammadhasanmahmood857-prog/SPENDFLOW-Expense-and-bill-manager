"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, CreditCard, FileText, LayoutDashboard, Menu, Settings2, X } from "lucide-react";
import { signOut } from "@/app/actions";
import { Brand } from "@/components/brand";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: CreditCard },
  { href: "/dashboard/budgets", label: "Budgets", icon: BarChart3 },
  { href: "/dashboard/bills", label: "Bills", icon: FileText },
];

export function Sidebar({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navigation = (
    <>
      <div className="px-6 pb-9 pt-7"><Brand /></div>
      <p className="eyebrow px-6 pb-3">Your money</p>
      <nav className="grid gap-1 px-3" aria-label="Main navigation">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-colors ${active ? "bg-[#edf2ff] text-[#265be8]" : "text-[#65716d] hover:bg-[#f3f5f4] hover:text-[#172321]"}`}>
              <Icon size={17} strokeWidth={1.9} />{label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[#e5eae7] p-4">
        <Link href="/dashboard/settings" onClick={() => setOpen(false)}
          className={`mb-3 flex h-10 items-center gap-3 rounded-lg px-2 text-[13px] font-semibold ${pathname === "/dashboard/settings" ? "text-[#265be8]" : "text-[#65716d] hover:text-[#172321]"}`}>
          <Settings2 size={17} />Settings
        </Link>
        <div className="flex items-center gap-3 rounded-xl bg-[#f7f8f6] p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f4c84a] text-sm font-bold text-[#51410d]">
            {(name || email).slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">{name || "Your account"}</span>
            <span className="block truncate text-[11px] text-[#788480]">{email}</span>
          </span>
          <form action={signOut}><button className="text-[11px] font-semibold text-[#788480] hover:text-[#172321]" type="submit">Log out</button></form>
        </div>
      </div>
    </>
  );
  return (
    <>
      <button className="icon-button fixed left-4 top-4 z-40 lg:hidden" aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-[#172321]/35 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[#e5eae7] bg-white transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {navigation}
      </aside>
    </>
  );
}
