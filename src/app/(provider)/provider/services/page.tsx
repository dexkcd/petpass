import type { Metadata } from "next";
import Link from "next/link";
import { deleteServiceAction, toggleServiceAction } from "@/actions/services";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { db } from "@/lib/db";
import { MODE_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { requireProviderClinic } from "@/lib/provider";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const { membership } = await requireProviderClinic("/provider/services");
  const services = await db.service.findMany({
    where: { clinicId: membership.clinicId },
    orderBy: [{ active: "desc" }, { category: { sortOrder: "asc" } }, { name: "asc" }],
    include: { category: true, _count: { select: { bookings: true } } },
  });
  return (
    <>
      <PageHeader
        title="Services"
        description="What owners can book with you, including niche and grooming services."
        actions={<ButtonLink href="/provider/services/new">Add service</ButtonLink>}
      />
      {services.length === 0 ? (
        <EmptyState title="No services yet" description="Add your first bookable service." action={<ButtonLink href="/provider/services/new">Add service</ButtonLink>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Mode</th>
                <th className="px-4 py-2">Duration</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Species</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/provider/services/${s.id}/edit`} className="hover:underline">
                      {s.name}
                    </Link>
                    <p className="text-xs font-normal text-muted">{s._count.bookings} bookings</p>
                  </td>
                  <td className="px-4 py-2">{s.category.name}</td>
                  <td className="px-4 py-2">{MODE_LABELS[s.mode]}</td>
                  <td className="px-4 py-2">{s.durationMin} min{s.bufferMin ? ` +${s.bufferMin}` : ""}</td>
                  <td className="px-4 py-2">{formatMoney(s.priceCents, s.currency)}</td>
                  <td className="px-4 py-2 text-xs">{s.species.length ? s.species.map((sp) => SPECIES_LABELS[sp]).join(", ") : "All"}</td>
                  <td className="px-4 py-2"><Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Bookable" : "Hidden"}</Badge></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <ConfirmButton action={toggleServiceAction.bind(null, s.id)}>{s.active ? "Hide" : "Show"}</ConfirmButton>
                    <ConfirmButton action={deleteServiceAction.bind(null, s.id)} confirm={`Delete "${s.name}"?`} className="text-danger">
                      Delete
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
