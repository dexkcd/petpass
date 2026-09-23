import type { ReactNode } from "react";
import { DashboardShell } from "@/components/nav/dashboard-shell";
import { requireRole } from "@/lib/auth-helpers";

export default async function ProviderLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("PROVIDER", "/provider");
  return (
    <DashboardShell
      title="Clinic / provider"
      userLabel={user.email ?? user.name ?? ""}
      items={[
        { href: "/provider", label: "Today", icon: "🏠" },
        { href: "/provider/bookings", label: "Bookings", icon: "📅" },
        { href: "/provider/patients", label: "Patients", icon: "🐾" },
        { href: "/provider/services", label: "Services", icon: "🧾" },
        { href: "/provider/availability", label: "Availability", icon: "🕒" },
        { href: "/provider/staff", label: "Staff", icon: "👥" },
        { href: "/provider/clinic", label: "Clinic profile", icon: "🏥" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
