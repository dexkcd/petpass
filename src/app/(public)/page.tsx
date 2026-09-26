import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/icons";
import { ShieldCheck, Stethoscope, Turtle } from "lucide-react";
import { db } from "@/lib/db";

// Category chips come from the database, which is not reachable at image
// build time, so render this page per request instead of prerendering it.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const categories = await db.serviceCategory.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" } });
  return (
    <main className="flex-1">
      <section className="bg-gradient-to-b from-teal-50 to-background">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <p className="mb-3 inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800">Online consults · Nearby clinics · Niche specialists · Grooming</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">All of your pet&apos;s care in one place</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            Keep a health record for every pet, book video consultations and in-person visits with vets, physios, reptile specialists and groomers near you, and share your pet&apos;s history with the clinics you trust.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/search" size="lg">
              Find a vet near me
            </ButtonLink>
            <ButtonLink href="/register" size="lg" variant="outline">
              Create a free account
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-4 text-xl font-semibold">Browse by service</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c.id} href={`/search?category=${c.slug}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              <CategoryIcon icon={c.icon} kind={c.kind} className="size-4 text-primary" />
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
        {[
          { Icon: Stethoscope, title: "Book in minutes", body: "See live availability, book an online video consult or an in-person visit, and get a meeting link when the clinic confirms." },
          { Icon: Turtle, title: "Specialists for every pet", body: "From physiotherapy and behaviour to reptile, avian and small-mammal care, find the right expert, not just the nearest one." },
          { Icon: ShieldCheck, title: "One record, shared on your terms", body: "Vaccinations, medications, conditions and visit notes in one place. Grant a clinic access, and revoke it whenever you like." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-6">
            <span aria-hidden className="grid size-11 place-items-center rounded-lg bg-teal-50 text-primary">
              <f.Icon className="size-6" />
            </span>
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center">
          <h2 className="text-xl font-semibold">Run a clinic, grooming salon or specialist practice?</h2>
          <p className="max-w-xl text-sm text-muted">List your services, manage bookings and see the records owners choose to share with you.</p>
          <ButtonLink href="/register?role=PROVIDER" variant="secondary">
            Register your business
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
