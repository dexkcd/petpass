import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export type NavItem = { href: string; label: string; icon?: string };

export function DashboardShell({
  title,
  items,
  userLabel,
  children,
}: {
  title: string;
  items: NavItem[];
  userLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-border bg-card md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">🐾</span>
            PetPass
          </Link>
          <p className="text-xs text-muted md:mt-2">{title}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
            >
              {item.icon ? <span aria-hidden>{item.icon}</span> : null}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-border px-4 py-3 md:block">
          <p className="truncate text-xs text-muted">{userLabel}</p>
          <form action={signOutAction} className="mt-2">
            <Button type="submit" variant="outline" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
