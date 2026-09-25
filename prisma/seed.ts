import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { MembershipRole, Role, ServiceMode, Species } from "../src/generated/prisma/enums";
import { CATEGORY_TAXONOMY } from "../src/lib/categories";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Password123!";
const TZ = "Asia/Manila";
const COUNTRY = "PH";
const CURRENCY = "PHP";

const day = 24 * 3600 * 1000;
const TZ_OFFSET_HOURS = 8; // Asia/Manila has no daylight saving time
/** An instant `n` days from now at the given clinic-local wall-clock time. */
function daysFromNow(n: number, hourLocal = 10, minute = 0) {
  const d = new Date(Date.now() + n * day);
  d.setUTCHours(hourLocal - TZ_OFFSET_HOURS, minute, 0, 0);
  return d;
}

async function seedCategories() {
  const idBySlug = new Map<string, string>();
  for (const c of CATEGORY_TAXONOMY) {
    const data = {
      name: c.name,
      kind: c.kind,
      sortOrder: c.sortOrder,
      icon: c.icon ?? null,
      parentId: c.parentSlug ? idBySlug.get(c.parentSlug) ?? null : null,
    };
    const row = await db.serviceCategory.upsert({ where: { slug: c.slug }, update: data, create: { slug: c.slug, ...data } });
    idBySlug.set(c.slug, row.id);
  }
  console.log(`Seeded ${idBySlug.size} service categories`);
  return idBySlug;
}

async function upsertUser(email: string, name: string, role: Role, passwordHash: string) {
  return db.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { email, name, role, passwordHash, emailVerified: new Date() },
  });
}

type ServiceSeed = {
  category: string;
  name: string;
  price: number;
  durationMin: number;
  bufferMin?: number;
  mode: ServiceMode;
  species?: Species[];
  description?: string;
};

type ClinicSeed = {
  slug: string;
  name: string;
  description: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
  phone: string;
  status: "PENDING" | "VERIFIED";
  ownerEmail: string;
  ownerName: string;
  staff?: Array<{ email: string; name: string; title: string }>;
  saturday?: boolean;
  services: ServiceSeed[];
};

const CLINICS: ClinicSeed[] = [
  {
    slug: "makati-paws-veterinary-clinic",
    name: "Makati Paws Veterinary Clinic",
    description: "Full-service small animal practice along Ayala Avenue. Same-day online consultations, dental suite and in-house laboratory. Open late on weekdays for working pet parents.",
    addressLine1: "6789 Ayala Avenue, Legazpi Village",
    city: "Makati",
    postalCode: "1229",
    lat: 14.5547,
    lng: 121.0244,
    phone: "+63 2 8845 0101",
    status: "VERIFIED",
    ownerEmail: "provider1@petpass.dev",
    ownerName: "Dr. Maria Santos",
    staff: [{ email: "staff1@petpass.dev", name: "Dr. Paolo Reyes", title: "Veterinarian" }],
    saturday: true,
    services: [
      { category: "general-vet", name: "Online video consultation", price: 500, durationMin: 20, mode: "ONLINE", description: "Talk to a vet from home. Ideal for advice, follow-ups and triage." },
      { category: "general-vet", name: "General health check", price: 650, durationMin: 30, mode: "IN_PERSON" },
      { category: "vaccination", name: "Annual vaccination (5-in-1 / 4-in-1)", price: 900, durationMin: 20, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "vaccination", name: "Anti-rabies vaccination", price: 350, durationMin: 15, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "dental", name: "Dental scaling & polishing", price: 4500, durationMin: 90, bufferMin: 30, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "surgery", name: "Spay / neuter consultation", price: 400, durationMin: 30, mode: "IN_PERSON", species: ["DOG", "CAT", "SMALL_MAMMAL"] },
      { category: "diagnostics", name: "Complete blood count & chemistry", price: 1800, durationMin: 30, mode: "IN_PERSON" },
    ],
  },
  {
    slug: "quezon-city-exotics-avian",
    name: "Quezon City Exotics & Avian",
    description: "Specialist care for reptiles, birds and small mammals near Tomas Morato. Husbandry reviews, UVB and diet planning, beak and nail care.",
    addressLine1: "123 Tomas Morato Avenue, South Triangle",
    city: "Quezon City",
    postalCode: "1103",
    lat: 14.6329,
    lng: 121.0355,
    phone: "+63 2 8926 0202",
    status: "VERIFIED",
    ownerEmail: "provider2@petpass.dev",
    ownerName: "Dr. Angelo Cruz",
    services: [
      { category: "exotic-reptile", name: "Reptile health check", price: 800, durationMin: 40, mode: "IN_PERSON", species: ["REPTILE"], description: "Full husbandry review including temperature, UVB and diet." },
      { category: "exotic-reptile", name: "Online reptile husbandry advice", price: 400, durationMin: 20, mode: "ONLINE", species: ["REPTILE"] },
      { category: "avian", name: "Bird wellness exam", price: 750, durationMin: 30, mode: "IN_PERSON", species: ["BIRD"] },
      { category: "avian", name: "Beak & nail trim", price: 300, durationMin: 15, mode: "IN_PERSON", species: ["BIRD"] },
      { category: "nutrition", name: "Small mammal diet consult", price: 600, durationMin: 30, mode: "IN_PERSON", species: ["SMALL_MAMMAL", "REPTILE", "BIRD"] },
    ],
  },
  {
    slug: "bgc-rehab-behaviour",
    name: "BGC Rehab & Behaviour",
    description: "Physiotherapy, post-surgical rehab and clinical behaviour therapy in Bonifacio Global City. Home visits across Taguig, Makati and Pasig.",
    addressLine1: "5th Avenue corner 26th Street, Bonifacio Global City",
    city: "Taguig",
    postalCode: "1634",
    lat: 14.5515,
    lng: 121.0473,
    phone: "+63 2 8856 0303",
    status: "VERIFIED",
    ownerEmail: "provider3@petpass.dev",
    ownerName: "Jasmine Villanueva",
    services: [
      { category: "physical-therapy", name: "Physiotherapy session (home visit)", price: 1500, durationMin: 60, bufferMin: 30, mode: "HOME_VISIT", species: ["DOG", "CAT", "HORSE"], description: "Post-surgical rehab, arthritis management and mobility work in your pet's own space." },
      { category: "physical-therapy", name: "Physiotherapy session (clinic)", price: 1200, durationMin: 45, bufferMin: 15, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "behaviour", name: "Behaviour assessment (online)", price: 1500, durationMin: 60, mode: "ONLINE", species: ["DOG", "CAT"] },
      { category: "behaviour", name: "Behaviour follow-up", price: 900, durationMin: 45, mode: "IN_PERSON", species: ["DOG", "CAT"] },
    ],
  },
  {
    slug: "pasig-grooming-studio",
    name: "Pasig Grooming Studio",
    description: "Calm, cage-free grooming for dogs and cats in Kapitolyo. Breed-standard cuts, de-shedding and puppy introductions.",
    addressLine1: "45 East Capitol Drive, Kapitolyo",
    city: "Pasig",
    postalCode: "1603",
    lat: 14.5701,
    lng: 121.0603,
    phone: "+63 2 8631 0404",
    status: "VERIFIED",
    ownerEmail: "provider4@petpass.dev",
    ownerName: "Miguel Tan",
    saturday: true,
    services: [
      { category: "bath", name: "Bath & blow dry", price: 450, durationMin: 60, bufferMin: 15, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "haircut", name: "Full groom", price: 900, durationMin: 120, bufferMin: 15, mode: "IN_PERSON", species: ["DOG"] },
      { category: "nail-trim", name: "Nail trim", price: 150, durationMin: 15, mode: "IN_PERSON", species: ["DOG", "CAT", "SMALL_MAMMAL"] },
      { category: "deshedding", name: "De-shedding treatment", price: 650, durationMin: 75, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "teeth-cleaning", name: "Cosmetic teeth cleaning", price: 300, durationMin: 20, mode: "IN_PERSON", species: ["DOG"] },
    ],
  },
  {
    slug: "mandaluyong-vets",
    name: "Mandaluyong Vets",
    description: "New neighbourhood practice near Shaw Boulevard opening soon.",
    addressLine1: "88 Shaw Boulevard, Pleasant Hills",
    city: "Mandaluyong",
    postalCode: "1552",
    lat: 14.5836,
    lng: 121.0326,
    phone: "+63 2 8535 0505",
    status: "PENDING",
    ownerEmail: "provider5@petpass.dev",
    ownerName: "Dr. Hannah Lim",
    services: [{ category: "general-vet", name: "General consultation", price: 600, durationMin: 30, mode: "IN_PERSON" }],
  },
];

async function seedDemo(categoryIds: Map<string, string>) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const admin = await upsertUser("admin@petpass.dev", "PetPass Admin", "ADMIN", passwordHash);
  const owner = await upsertUser("owner@petpass.dev", "Sam Dela Cruz", "OWNER", passwordHash);
  const owner2 = await upsertUser("owner2@petpass.dev", "Riley Bautista", "OWNER", passwordHash);

  const clinicsBySlug = new Map<string, { id: string; ownerId: string; staffIds: string[] }>();
  for (const c of CLINICS) {
    const clinicOwner = await upsertUser(c.ownerEmail, c.ownerName, "PROVIDER", passwordHash);
    const clinic = await db.clinic.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        addressLine1: c.addressLine1,
        city: c.city,
        postalCode: c.postalCode,
        country: COUNTRY,
        lat: c.lat,
        lng: c.lng,
        phone: c.phone,
        timezone: TZ,
        status: c.status,
        verifiedAt: c.status === "VERIFIED" ? new Date() : null,
        verifiedById: c.status === "VERIFIED" ? admin.id : null,
      },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        addressLine1: c.addressLine1,
        city: c.city,
        postalCode: c.postalCode,
        country: COUNTRY,
        lat: c.lat,
        lng: c.lng,
        phone: c.phone,
        email: `hello@${c.slug}.example`,
        timezone: TZ,
        status: c.status,
        verifiedAt: c.status === "VERIFIED" ? new Date() : null,
        verifiedById: c.status === "VERIFIED" ? admin.id : null,
      },
    });

    const members: Array<{ userId: string; role: MembershipRole; title: string }> = [
      { userId: clinicOwner.id, role: "CLINIC_OWNER", title: "Owner" },
    ];
    const staffIds: string[] = [];
    for (const s of c.staff ?? []) {
      const u = await upsertUser(s.email, s.name, "PROVIDER", passwordHash);
      members.push({ userId: u.id, role: "STAFF", title: s.title });
      staffIds.push(u.id);
    }
    for (const m of members) {
      await db.membership.upsert({
        where: { userId_clinicId: { userId: m.userId, clinicId: clinic.id } },
        update: { role: m.role, title: m.title, active: true },
        create: { userId: m.userId, clinicId: clinic.id, role: m.role, title: m.title },
      });
    }

    // Services: replace by name for idempotency
    for (const s of c.services) {
      const categoryId = categoryIds.get(s.category);
      if (!categoryId) throw new Error(`Unknown category ${s.category}`);
      const existing = await db.service.findFirst({ where: { clinicId: clinic.id, name: s.name } });
      const data = {
        categoryId,
        name: s.name,
        description: s.description ?? null,
        priceCents: Math.round(s.price * 100),
        currency: CURRENCY,
        durationMin: s.durationMin,
        bufferMin: s.bufferMin ?? 0,
        mode: s.mode,
        species: s.species ?? [],
        active: true,
      };
      if (existing) await db.service.update({ where: { id: existing.id }, data });
      else await db.service.create({ data: { ...data, clinicId: clinic.id } });
    }

    // Weekly availability (clinic-wide): Mon-Fri 09:00-17:00, Sat 10:00-14:00 where applicable
    await db.availability.deleteMany({ where: { clinicId: clinic.id } });
    const rules = [1, 2, 3, 4, 5].map((weekday) => ({ clinicId: clinic.id, weekday, startMinutes: 9 * 60, endMinutes: 17 * 60 }));
    if (c.saturday) rules.push({ clinicId: clinic.id, weekday: 6, startMinutes: 10 * 60, endMinutes: 14 * 60 });
    await db.availability.createMany({ data: rules });

    clinicsBySlug.set(c.slug, { id: clinic.id, ownerId: clinicOwner.id, staffIds });
  }

  // A block next week at Makati (afternoon off)
  const camden = clinicsBySlug.get("makati-paws-veterinary-clinic")!;
  const shoreditch = clinicsBySlug.get("quezon-city-exotics-avian")!;
  const greenwich = clinicsBySlug.get("pasig-grooming-studio")!;
  await db.availabilityBlock.deleteMany({ where: { clinicId: camden.id } });
  await db.availabilityBlock.create({
    data: { clinicId: camden.id, startsAt: daysFromNow(7, 13), endsAt: daysFromNow(7, 17), reason: "Team training" },
  });

  // Pets for the demo owner
  async function upsertPet(ownerId: string, name: string, data: Omit<Prisma.PetUncheckedCreateInput, "ownerId" | "name">) {
    const existing = await db.pet.findFirst({ where: { ownerId, name, deletedAt: null } });
    if (existing) return db.pet.update({ where: { id: existing.id }, data });
    return db.pet.create({ data: { ...data, ownerId, name } });
  }
  const biscuit = await upsertPet(owner.id, "Biscuit", {
    species: "DOG",
    breed: "Aspin (Labrador mix)",
    sex: "MALE",
    birthDate: new Date("2021-04-10"),
    weightKg: 29.4,
    color: "Yellow",
    microchipId: "985112003456789",
    notes: "Friendly but pulls on the lead. Allergic to chicken.",
  });
  const mochi = await upsertPet(owner.id, "Mochi", {
    species: "CAT",
    breed: "Puspin",
    sex: "FEMALE",
    birthDate: new Date("2019-11-02"),
    weightKg: 4.6,
    color: "Blue",
  });
  const rex = await upsertPet(owner.id, "Rex", {
    species: "REPTILE",
    breed: "Bearded dragon",
    sex: "MALE",
    birthDate: new Date("2023-06-15"),
    weightKg: 0.42,
    notes: "Basking spot 40°C, UVB tube replaced March.",
  });
  await upsertPet(owner2.id, "Pepper", { species: "DOG", breed: "Shih Tzu", sex: "FEMALE", birthDate: new Date("2022-01-20") });

  // Records for Biscuit
  await db.vaccination.deleteMany({ where: { petId: biscuit.id } });
  await db.vaccination.createMany({
    data: [
      { petId: biscuit.id, name: "DHPP booster", administeredAt: new Date(Date.now() - 340 * day), expiresAt: new Date(Date.now() + 20 * day), clinicId: camden.id, createdById: camden.ownerId, administeredBy: "Makati Paws Veterinary Clinic" },
      { petId: biscuit.id, name: "Rabies", administeredAt: new Date(Date.now() - 400 * day), expiresAt: new Date(Date.now() + 695 * day), clinicId: camden.id, createdById: camden.ownerId, administeredBy: "Makati Paws Veterinary Clinic" },
      { petId: biscuit.id, name: "Leptospirosis", administeredAt: new Date(Date.now() - 100 * day), expiresAt: new Date(Date.now() + 265 * day), createdById: owner.id },
    ],
  });
  await db.medication.deleteMany({ where: { petId: biscuit.id } });
  await db.medication.create({
    data: { petId: biscuit.id, name: "Apoquel", dosage: "16 mg", frequency: "Once daily", startDate: new Date(Date.now() - 30 * day), prescribedBy: "Dr. Maria Santos", clinicId: camden.id, createdById: camden.ownerId, active: true },
  });
  await db.condition.deleteMany({ where: { petId: biscuit.id } });
  await db.condition.create({
    data: { petId: biscuit.id, name: "Chicken protein allergy", diagnosedAt: new Date(Date.now() - 200 * day), severity: "MODERATE", notes: "Itchy paws and ears when exposed. Managed with diet and Apoquel.", createdById: owner.id },
  });
  await db.vaccination.deleteMany({ where: { petId: mochi.id } });
  await db.vaccination.create({
    data: { petId: mochi.id, name: "FVRCP", administeredAt: new Date(Date.now() - 300 * day), expiresAt: new Date(Date.now() + 65 * day), createdById: owner.id },
  });

  // Record access grants
  await db.recordAccessGrant.deleteMany({ where: { petId: { in: [biscuit.id, rex.id, mochi.id] } } });
  await db.recordAccessGrant.createMany({
    data: [
      { petId: biscuit.id, clinicId: camden.id, scope: "READ_WRITE", grantedById: owner.id, expiresAt: new Date(Date.now() + 90 * day) },
      { petId: rex.id, clinicId: shoreditch.id, scope: "READ", grantedById: owner.id, expiresAt: new Date(Date.now() + 90 * day) },
    ],
  });

  // Bookings
  const services = await db.service.findMany({ where: { clinicId: { in: [camden.id, greenwich.id, shoreditch.id] } } });
  const svc = (clinicId: string, name: string) => {
    const s = services.find((x) => x.clinicId === clinicId && x.name === name);
    if (!s) throw new Error(`Missing service ${name}`);
    return s;
  };
  await db.visitNote.deleteMany({ where: { petId: { in: [biscuit.id, rex.id, mochi.id] } } });
  await db.booking.deleteMany({ where: { ownerId: owner.id } });

  const check = svc(camden.id, "General health check");
  const past = await db.booking.create({
    data: {
      petId: biscuit.id, ownerId: owner.id, clinicId: camden.id, serviceId: check.id, staffId: camden.ownerId,
      startsAt: daysFromNow(-12, 10, 30), endsAt: daysFromNow(-12, 11, 0), status: "COMPLETED", mode: check.mode,
      priceCents: check.priceCents, currency: check.currency, ownerNotes: "Scratching a lot lately.",
    },
  });
  await db.visitNote.create({
    data: {
      petId: biscuit.id, clinicId: camden.id, authorId: camden.ownerId, bookingId: past.id, visitedAt: past.startsAt,
      summary: "Presented with pruritus affecting paws and ears. Skin otherwise healthy, no ectoparasites found.",
      diagnosis: "Suspected food allergy (chicken).", treatment: "Started Apoquel 16 mg daily; recommended hydrolysed diet trial for 8 weeks.",
      followUpAt: daysFromNow(44),
    },
  });

  const online = svc(camden.id, "Online video consultation");
  await db.booking.create({
    data: {
      petId: biscuit.id, ownerId: owner.id, clinicId: camden.id, serviceId: online.id, staffId: camden.ownerId,
      startsAt: daysFromNow(5, 10, 0), endsAt: daysFromNow(5, 10, 20), status: "CONFIRMED", mode: online.mode,
      priceCents: online.priceCents, currency: online.currency, meetingUrl: "https://meet.google.com/abc-defg-hij",
      ownerNotes: "Follow-up on the diet trial.",
    },
  });

  const groom = svc(greenwich.id, "Full groom");
  await db.booking.create({
    data: {
      petId: biscuit.id, ownerId: owner.id, clinicId: greenwich.id, serviceId: groom.id,
      startsAt: daysFromNow(9, 13, 0), endsAt: daysFromNow(9, 15, 0), status: "PENDING", mode: groom.mode,
      priceCents: groom.priceCents, currency: groom.currency,
    },
  });

  const reptile = svc(shoreditch.id, "Reptile health check");
  await db.booking.create({
    data: {
      petId: rex.id, ownerId: owner.id, clinicId: shoreditch.id, serviceId: reptile.id,
      startsAt: daysFromNow(-3, 14, 0), endsAt: daysFromNow(-3, 14, 40), status: "CANCELLED_BY_OWNER", mode: reptile.mode,
      priceCents: reptile.priceCents, currency: reptile.currency, cancelReason: "Couldn't make it",
    },
  });

  console.log("Seeded demo users, clinics, services, pets, records and bookings");
  console.log(`Demo password for all accounts: ${DEMO_PASSWORD}`);
}

/** Wipe every application table. Only for demo databases (SEED_RESET=true). */
async function resetDatabase() {
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  console.log(`Reset ${tables.length} tables (SEED_RESET=true)`);
}

async function main() {
  if ((process.env.SEED_RESET ?? "false").toLowerCase() === "true") await resetDatabase();
  const categoryIds = await seedCategories();
  const demo = (process.env.SEED_DEMO ?? "true").toLowerCase() !== "false";
  if (demo) await seedDemo(categoryIds);
  else console.log("SEED_DEMO=false: skipped demo data");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
