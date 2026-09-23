import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { MembershipRole, Role, ServiceMode, Species } from "../src/generated/prisma/enums";
import { CATEGORY_TAXONOMY } from "../src/lib/categories";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Password123!";
const TZ = "Europe/London";

const day = 24 * 3600 * 1000;
function daysFromNow(n: number, hourUtc = 10, minute = 0) {
  const d = new Date(Date.now() + n * day);
  d.setUTCHours(hourUtc, minute, 0, 0);
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
    slug: "camden-paws-veterinary",
    name: "Camden Paws Veterinary",
    description: "Friendly full-service small animal practice in the heart of Camden. Same-day online consultations, dental suite and in-house diagnostics.",
    addressLine1: "12 Camden High Street",
    city: "London",
    postalCode: "NW1 0JH",
    lat: 51.539,
    lng: -0.1426,
    phone: "+44 20 7946 0101",
    status: "VERIFIED",
    ownerEmail: "provider1@petpass.dev",
    ownerName: "Dr Amara Osei",
    staff: [{ email: "staff1@petpass.dev", name: "Dr Ben Carter", title: "Veterinary surgeon" }],
    saturday: true,
    services: [
      { category: "general-vet", name: "Online video consultation", price: 35, durationMin: 20, mode: "ONLINE", description: "Speak to a vet from home. Ideal for advice, follow-ups and triage." },
      { category: "general-vet", name: "General health check", price: 55, durationMin: 30, mode: "IN_PERSON" },
      { category: "vaccination", name: "Annual vaccination", price: 48, durationMin: 20, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "dental", name: "Dental scale & polish", price: 320, durationMin: 90, bufferMin: 30, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "surgery", name: "Neutering consultation", price: 40, durationMin: 30, mode: "IN_PERSON", species: ["DOG", "CAT", "SMALL_MAMMAL"] },
      { category: "diagnostics", name: "Blood panel", price: 120, durationMin: 30, mode: "IN_PERSON" },
    ],
  },
  {
    slug: "shoreditch-exotics-avian",
    name: "Shoreditch Exotics & Avian",
    description: "Specialist care for reptiles, birds and small mammals. Species-appropriate husbandry advice, UVB and diet reviews, and beak/nail care.",
    addressLine1: "88 Curtain Road",
    city: "London",
    postalCode: "EC2A 3AA",
    lat: 51.5255,
    lng: -0.0776,
    phone: "+44 20 7946 0202",
    status: "VERIFIED",
    ownerEmail: "provider2@petpass.dev",
    ownerName: "Dr Priya Nair",
    services: [
      { category: "exotic-reptile", name: "Reptile health check", price: 65, durationMin: 40, mode: "IN_PERSON", species: ["REPTILE"], description: "Full husbandry review including temperature, UVB and diet." },
      { category: "exotic-reptile", name: "Online reptile husbandry advice", price: 30, durationMin: 20, mode: "ONLINE", species: ["REPTILE"] },
      { category: "avian", name: "Bird wellness exam", price: 60, durationMin: 30, mode: "IN_PERSON", species: ["BIRD"] },
      { category: "avian", name: "Beak & nail trim", price: 25, durationMin: 15, mode: "IN_PERSON", species: ["BIRD"] },
      { category: "nutrition", name: "Small mammal diet consult", price: 45, durationMin: 30, mode: "IN_PERSON", species: ["SMALL_MAMMAL", "REPTILE", "BIRD"] },
    ],
  },
  {
    slug: "battersea-rehab-behaviour",
    name: "Battersea Rehab & Behaviour",
    description: "Physiotherapy, hydrotherapy referrals and clinical behaviour therapy. Home visits across south-west London.",
    addressLine1: "5 Battersea Park Road",
    city: "London",
    postalCode: "SW11 4NE",
    lat: 51.479,
    lng: -0.156,
    phone: "+44 20 7946 0303",
    status: "VERIFIED",
    ownerEmail: "provider3@petpass.dev",
    ownerName: "Jo Whitfield",
    services: [
      { category: "physical-therapy", name: "Physiotherapy session (home visit)", price: 85, durationMin: 60, bufferMin: 30, mode: "HOME_VISIT", species: ["DOG", "CAT", "HORSE"], description: "Post-surgical rehab, arthritis management and mobility work in your pet's own space." },
      { category: "physical-therapy", name: "Physiotherapy session (clinic)", price: 70, durationMin: 45, bufferMin: 15, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "behaviour", name: "Behaviour assessment (online)", price: 90, durationMin: 60, mode: "ONLINE", species: ["DOG", "CAT"] },
      { category: "behaviour", name: "Behaviour follow-up", price: 60, durationMin: 45, mode: "IN_PERSON", species: ["DOG", "CAT"] },
    ],
  },
  {
    slug: "greenwich-grooming-studio",
    name: "Greenwich Grooming Studio",
    description: "Calm, cage-free grooming for dogs and cats. Breed-standard cuts, de-shedding and puppy introductions.",
    addressLine1: "21 Greenwich Church Street",
    city: "London",
    postalCode: "SE10 9BJ",
    lat: 51.4826,
    lng: -0.0077,
    phone: "+44 20 7946 0404",
    status: "VERIFIED",
    ownerEmail: "provider4@petpass.dev",
    ownerName: "Marcus Lee",
    saturday: true,
    services: [
      { category: "bath", name: "Bath & blow dry", price: 35, durationMin: 60, bufferMin: 15, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "haircut", name: "Full groom", price: 60, durationMin: 120, bufferMin: 15, mode: "IN_PERSON", species: ["DOG"] },
      { category: "nail-trim", name: "Nail trim", price: 12, durationMin: 15, mode: "IN_PERSON", species: ["DOG", "CAT", "SMALL_MAMMAL"] },
      { category: "deshedding", name: "De-shedding treatment", price: 45, durationMin: 75, mode: "IN_PERSON", species: ["DOG", "CAT"] },
      { category: "teeth-cleaning", name: "Cosmetic teeth cleaning", price: 20, durationMin: 20, mode: "IN_PERSON", species: ["DOG"] },
    ],
  },
  {
    slug: "islington-vets",
    name: "Islington Vets",
    description: "New neighbourhood practice opening soon.",
    addressLine1: "40 Upper Street",
    city: "London",
    postalCode: "N1 0PN",
    lat: 51.5362,
    lng: -0.103,
    phone: "+44 20 7946 0505",
    status: "PENDING",
    ownerEmail: "provider5@petpass.dev",
    ownerName: "Dr Hannah Reid",
    services: [{ category: "general-vet", name: "General consultation", price: 50, durationMin: 30, mode: "IN_PERSON" }],
  },
];

async function seedDemo(categoryIds: Map<string, string>) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const admin = await upsertUser("admin@petpass.dev", "PetPass Admin", "ADMIN", passwordHash);
  const owner = await upsertUser("owner@petpass.dev", "Sam Taylor", "OWNER", passwordHash);
  const owner2 = await upsertUser("owner2@petpass.dev", "Riley Chen", "OWNER", passwordHash);

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
        country: "GB",
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
        country: "GB",
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
        currency: "GBP",
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

  // A block next week at Camden (afternoon off)
  const camden = clinicsBySlug.get("camden-paws-veterinary")!;
  const shoreditch = clinicsBySlug.get("shoreditch-exotics-avian")!;
  const greenwich = clinicsBySlug.get("greenwich-grooming-studio")!;
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
    breed: "Labrador Retriever",
    sex: "MALE",
    birthDate: new Date("2021-04-10"),
    weightKg: 29.4,
    color: "Yellow",
    microchipId: "985112003456789",
    notes: "Friendly but pulls on the lead. Allergic to chicken.",
  });
  const mochi = await upsertPet(owner.id, "Mochi", {
    species: "CAT",
    breed: "British Shorthair",
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
  await upsertPet(owner2.id, "Pepper", { species: "DOG", breed: "Cockapoo", sex: "FEMALE", birthDate: new Date("2022-01-20") });

  // Records for Biscuit
  await db.vaccination.deleteMany({ where: { petId: biscuit.id } });
  await db.vaccination.createMany({
    data: [
      { petId: biscuit.id, name: "DHPP booster", administeredAt: new Date(Date.now() - 340 * day), expiresAt: new Date(Date.now() + 20 * day), clinicId: camden.id, createdById: camden.ownerId, administeredBy: "Camden Paws Veterinary" },
      { petId: biscuit.id, name: "Rabies", administeredAt: new Date(Date.now() - 400 * day), expiresAt: new Date(Date.now() + 695 * day), clinicId: camden.id, createdById: camden.ownerId, administeredBy: "Camden Paws Veterinary" },
      { petId: biscuit.id, name: "Leptospirosis", administeredAt: new Date(Date.now() - 100 * day), expiresAt: new Date(Date.now() + 265 * day), createdById: owner.id },
    ],
  });
  await db.medication.deleteMany({ where: { petId: biscuit.id } });
  await db.medication.create({
    data: { petId: biscuit.id, name: "Apoquel", dosage: "16 mg", frequency: "Once daily", startDate: new Date(Date.now() - 30 * day), prescribedBy: "Dr Amara Osei", clinicId: camden.id, createdById: camden.ownerId, active: true },
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

async function main() {
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
