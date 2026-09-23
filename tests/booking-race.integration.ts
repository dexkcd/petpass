/**
 * Integration check for double-booking protection. Not part of `pnpm test`
 * (needs a database). Run with:
 *   DATABASE_URL=postgresql://... pnpm exec tsx tests/booking-race.integration.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function attempt(clinicId: string, petId: string, ownerId: string, serviceId: string, startsAt: Date, endsAt: Date) {
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${clinicId}))`;
      const clash = await tx.booking.count({
        where: { clinicId, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
      });
      if (clash > 0) throw new Error("taken");
      const b = await tx.booking.create({
        data: { petId, ownerId, clinicId, serviceId, startsAt, endsAt, mode: "ONLINE", priceCents: 0, currency: "GBP" },
      });
      return b.id;
    });
  } catch (e) {
    return `rejected: ${(e as Error).message}`;
  }
}

async function main() {
  const clinic = await db.clinic.findUniqueOrThrow({ where: { slug: "camden-paws-veterinary" } });
  const service = await db.service.findFirstOrThrow({ where: { clinicId: clinic.id } });
  const pet = await db.pet.findFirstOrThrow({ where: { name: "Biscuit", deletedAt: null } });
  const startsAt = new Date("2030-01-07T09:00:00Z");
  const endsAt = new Date("2030-01-07T09:20:00Z");
  await db.booking.deleteMany({ where: { clinicId: clinic.id, startsAt } });

  const results = await Promise.all(Array.from({ length: 5 }, () => attempt(clinic.id, pet.id, pet.ownerId, service.id, startsAt, endsAt)));
  const created = results.filter((r) => !r.startsWith("rejected"));
  console.log(results);
  console.log(`created: ${created.length}, rejected: ${results.length - created.length}`);
  await db.booking.deleteMany({ where: { clinicId: clinic.id, startsAt } });
  if (created.length !== 1) {
    console.error("DOUBLE BOOKING DETECTED");
    process.exitCode = 1;
  }
}

main().finally(() => db.$disconnect());
