import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/card";
import { db } from "@/lib/db";

export default async function AdminHome() {
  const [pendingClinics, verifiedClinics, users, pets, bookings] = await Promise.all([
    db.clinic.count({ where: { status: "PENDING" } }),
    db.clinic.count({ where: { status: "VERIFIED" } }),
    db.user.count(),
    db.pet.count({ where: { deletedAt: null } }),
    db.booking.count(),
  ]);
  const stats = [
    { label: "Clinics awaiting verification", value: pendingClinics, href: "/admin/clinics?status=PENDING" },
    { label: "Verified clinics", value: verifiedClinics, href: "/admin/clinics?status=VERIFIED" },
    { label: "Users", value: users, href: "/admin/users" },
    { label: "Pets", value: pets },
    { label: "Bookings", value: bookings },
  ];
  return (
    <>
      <PageHeader title="Administration" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-sm text-muted">{s.label}</p>
            <p className="text-3xl font-bold">{s.value}</p>
            {s.href ? (
              <Link href={s.href} className="text-sm text-primary hover:underline">
                Open
              </Link>
            ) : null}
          </Card>
        ))}
      </div>
    </>
  );
}
