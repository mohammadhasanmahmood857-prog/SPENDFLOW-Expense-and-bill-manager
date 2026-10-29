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
      <div className="px-6 pb-8 pt-7"><Brand /></div>
      <p className="px-6 pb-3 text-xs text-[var(--muted)]">Your money</p>
      <nav className="grid gap-1 px-3" aria-label="Main navigation">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`flex h-11 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors ${active ? "bg-[var(--surface-muted)] text-[var(--ink)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"}`}>
              <Icon size={17} strokeWidth={1.9} />{label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[var(--line)] p-4">
        <Link href="/dashboard/settings" onClick={() => setOpen(false)}
          className={`mb-3 flex h-10 items-center gap-3 rounded-md px-2 text-[13px] font-medium ${pathname === "/dashboard/settings" ? "bg-[var(--surface-muted)] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>
          <Settings2 size={17} />Settings
        </Link>
        <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-muted)] p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-neutral)] text-sm font-medium text-[var(--ink-soft)]">
            {(name || email).slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">{name || "Your account"}</span>
            <span className="block truncate text-xs text-[var(--muted)]">{email}</span>
          </span>
          <form action={signOut}><button className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]" type="submit">Log out</button></form>
        </div>
      </div>
    </>
  );
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60] flex h-14 items-center gap-3 border-b border-[var(--line)] bg-white px-4 lg:hidden">
        <button className="grid size-9 place-items-center rounded-md text-[var(--ink-soft)] hover:bg-[var(--surface-muted)]" aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
        <Brand />
      </header>
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-[var(--ink)]/35 lg:hidden" onClick={() => setOpen(false)} />}
      <aside id="primary-navigation" className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[var(--line)] bg-white transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {navigation}
      </aside>
    </>
  );
}
