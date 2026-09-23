import type { ReactNode } from "react";
import { DashboardShell } from "@/components/nav/dashboard-shell";
import { requireRole } from "@/lib/auth-helpers";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("OWNER", "/owner");
  return (
    <DashboardShell
      title="Pet owner"
      userLabel={user.email ?? user.name ?? ""}
      items={[
        { href: "/owner", label: "Overview", icon: "🏠" },
        { href: "/owner/pets", label: "My pets", icon: "🐾" },
        { href: "/owner/bookings", label: "Bookings", icon: "📅" },
        { href: "/search", label: "Find a vet", icon: "🔎" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
