import type { Metadata } from "next";
import Link from "next/link";
import { ClinicReviewButtons } from "@/components/admin/clinic-review";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { ClinicStatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import type { ClinicStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Clinics" };

const STATUSES: Array<ClinicStatus | "ALL"> = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED", "ALL"];

export default async function AdminClinicsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as ClinicStatus) ? (status as ClinicStatus | "ALL") : "PENDING";
  const clinics = await db.clinic.findMany({
    where: filter === "ALL" ? {} : { status: filter },
    orderBy: { createdAt: "desc" },
    include: { memberships: { where: { role: "CLINIC_OWNER" }, include: { user: { select: { email: true, name: true } } } }, _count: { select: { services: true } } },
  });
  return (
    <>
      <PageHeader title="Clinics" description="Verify new listings before they appear in search." />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/clinics?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm ${filter === s ? "bg-primary text-primary-foreground" : "bg-slate-100 hover:bg-slate-200"}`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>
      {clinics.length === 0 ? (
        <EmptyState title="No clinics in this state" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Clinic</th>
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Services</th>
                <th className="px-4 py-2">Registered</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clinics.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/admin/clinics/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{c.memberships[0]?.user.email ?? "—"}</td>
                  <td className="px-4 py-2">
                    {c.city}, {c.country}
                  </td>
                  <td className="px-4 py-2">{c._count.services}</td>
                  <td className="px-4 py-2">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-2"><ClinicStatusBadge status={c.status} /></td>
                  <td className="px-4 py-2"><ClinicReviewButtons clinicId={c.id} status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
