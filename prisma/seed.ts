import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CATEGORY_TAXONOMY } from "../src/lib/categories";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function seedCategories() {
  const idBySlug = new Map<string, string>();
  for (const c of CATEGORY_TAXONOMY) {
    const row = await db.serviceCategory.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        kind: c.kind,
        sortOrder: c.sortOrder,
        icon: c.icon ?? null,
        parentId: c.parentSlug ? idBySlug.get(c.parentSlug) ?? null : null,
      },
      create: {
        slug: c.slug,
        name: c.name,
        kind: c.kind,
        sortOrder: c.sortOrder,
        icon: c.icon ?? null,
        parentId: c.parentSlug ? idBySlug.get(c.parentSlug) ?? null : null,
      },
    });
    idBySlug.set(c.slug, row.id);
  }
  console.log(`Seeded ${idBySlug.size} service categories`);
  return idBySlug;
}

async function main() {
  await seedCategories();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
