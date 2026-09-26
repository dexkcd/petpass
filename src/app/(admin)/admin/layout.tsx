import type { ReactNode } from "react";
import { DashboardShell } from "@/components/nav/dashboard-shell";
import { requireRole } from "@/lib/auth-helpers";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("ADMIN", "/admin");
  return (
    <DashboardShell
      title="Administration"
      userLabel={user.email ?? user.name ?? ""}
      items={[
        { href: "/admin", label: "Overview", icon: "home" },
        { href: "/admin/clinics", label: "Clinics", icon: "hospital" },
        { href: "/admin/categories", label: "Categories", icon: "folders" },
        { href: "/admin/users", label: "Users", icon: "users" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
