import type { ReactNode } from "react";
import { SiteHeader } from "@/components/nav/site-header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} PetPass
      </footer>
    </>
  );
}
