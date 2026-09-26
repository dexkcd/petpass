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
        { href: "/provider", label: "Today", icon: "home" },
        { href: "/provider/bookings", label: "Bookings", icon: "calendar" },
        { href: "/provider/patients", label: "Patients", icon: "paw" },
        { href: "/provider/services", label: "Services", icon: "receipt" },
        { href: "/provider/availability", label: "Availability", icon: "clock" },
        { href: "/provider/staff", label: "Staff", icon: "users" },
        { href: "/provider/clinic", label: "Clinic profile", icon: "hospital" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
