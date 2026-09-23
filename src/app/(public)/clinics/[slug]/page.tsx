import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClinicMap } from "@/components/maps/clinic-map";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Card, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { KIND_LABELS, MODE_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { minutesToLabel } from "@/lib/time";
import { formatMoney } from "@/lib/utils";
import type { ServiceKind } from "@/generated/prisma/enums";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const clinic = await db.clinic.findUnique({ where: { slug }, select: { name: true, description: true } });
  return { title: clinic?.name ?? "Clinic", description: clinic?.description ?? undefined };
}

export default async function ClinicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [clinic, user] = await Promise.all([
    db.clinic.findUnique({
      where: { slug },
      include: {
        services: { where: { active: true }, include: { category: true }, orderBy: [{ category: { sortOrder: "asc" } }, { priceCents: "asc" }] },
        availability: { where: { staffId: null }, orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }] },
        memberships: { where: { active: true }, include: { user: { select: { id: true, name: true } } } },
      },
    }),
    getSessionUser(),
  ]);
  if (!clinic) notFound();

  const isMember = user ? clinic.memberships.some((m) => m.user.id === user.id) : false;
  const visible = clinic.status === "VERIFIED" || user?.role === "ADMIN" || isMember;
  if (!visible) notFound();

  const byKind = (Object.keys(KIND_LABELS) as ServiceKind[])
    .map((kind) => ({ kind, services: clinic.services.filter((s) => s.category.kind === kind) }))
    .filter((g) => g.services.length > 0);

  const hours = WEEKDAYS.map((label, weekday) => ({
    label,
    ranges: clinic.availability.filter((a) => a.weekday === weekday).map((a) => `${minutesToLabel(a.startMinutes)}–${minutesToLabel(a.endMinutes)}`),
  }));

  const address = [clinic.addressLine1, clinic.addressLine2, clinic.city, clinic.postalCode].filter(Boolean).join(", ");
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}${clinic.placeId ? `&query_place_id=${clinic.placeId}` : ""}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      {clinic.status !== "VERIFIED" ? (
        <div className="mb-4">
          <Alert tone="warning">This listing is {clinic.status.toLowerCase()} and only visible to its staff and admins.</Alert>
        </div>
      ) : null}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{clinic.name}</h1>
          <p className="mt-1 text-muted">
            <a href={mapsLink} target="_blank" rel="noreferrer" className="hover:underline">
              {address}
            </a>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {byKind.map((g) => (
              <Badge key={g.kind} tone={g.kind === "VET" ? "primary" : g.kind === "SPECIALIST" ? "info" : "warning"}>
                {KIND_LABELS[g.kind]}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {clinic.phone ? (
            <a href={`tel:${clinic.phone}`} className="rounded-lg border border-border bg-card px-3 py-2 hover:bg-slate-50">
              📞 {clinic.phone}
            </a>
          ) : null}
          {clinic.website ? (
            <a href={clinic.website} target="_blank" rel="noreferrer" className="rounded-lg border border-border bg-card px-3 py-2 hover:bg-slate-50">
              🌐 Website
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {clinic.description ? <p className="whitespace-pre-line text-sm leading-6">{clinic.description}</p> : null}
          {byKind.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">This clinic has not listed any bookable services yet.</p>
            </Card>
          ) : (
            byKind.map((g) => (
              <section key={g.kind}>
                <h2 className="mb-2 text-lg font-semibold">{KIND_LABELS[g.kind]} services</h2>
                <ul className="space-y-2">
                  {g.services.map((s) => (
                    <li key={s.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">
                          {s.category.icon ? `${s.category.icon} ` : ""}
                          {s.name}
                        </p>
                        <p className="text-sm text-muted">
                          {s.category.name} · {MODE_LABELS[s.mode]} · {s.durationMin} min
                          {s.species.length ? ` · ${s.species.map((sp) => SPECIES_LABELS[sp]).join(", ")}` : " · all species"}
                        </p>
                        {s.description ? <p className="mt-1 text-sm text-muted">{s.description}</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-semibold">{formatMoney(s.priceCents, s.currency)}</span>
                        {user?.role === "PROVIDER" ? null : (
                          <ButtonLink href={`/owner/book/${s.id}`} size="sm">
                            Book
                          </ButtonLink>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <div className="space-y-4">
          <ClinicMap clinics={[{ id: clinic.id, slug: clinic.slug, name: clinic.name, lat: clinic.lat, lng: clinic.lng }]} center={{ lat: clinic.lat, lng: clinic.lng }} className="h-56" />
          <Card>
            <CardTitle>Opening hours</CardTitle>
            <dl className="mt-2 grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
              {hours.map((h) => (
                <div key={h.label} className="contents">
                  <dt className="text-muted">{h.label}</dt>
                  <dd>{h.ranges.length ? h.ranges.join(", ") : "Closed"}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-muted">Times shown in {clinic.timezone}.</p>
          </Card>
          <Card>
            <CardTitle>Team</CardTitle>
            <ul className="mt-2 space-y-1 text-sm">
              {clinic.memberships.map((m) => (
                <li key={m.id}>
                  {m.user.name ?? "Staff"}
                  {m.title ? <span className="text-muted"> · {m.title}</span> : null}
                </li>
              ))}
            </ul>
          </Card>
          {!user ? (
            <p className="text-xs text-muted">
              <Link href="/register" className="text-primary hover:underline">
                Create an account
              </Link>{" "}
              to book and share your pet&apos;s records with this clinic.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
