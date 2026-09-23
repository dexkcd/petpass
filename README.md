# PetPass

Pet health app: keep each pet's health record, find nearby vets, specialists and groomers, book online video consultations and in-person services, and share a pet's history with clinics you trust.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 · PostgreSQL · Auth.js v5 · Google Maps · PWA · Railway

## Local development

Requirements: Node 24 (LTS), pnpm 10, Docker (for Postgres) or a local PostgreSQL 16+.

```bash
pnpm install
cp .env.example .env          # then fill in AUTH_SECRET and any Google keys you have
docker compose up -d db       # local Postgres on :5432
pnpm db:migrate               # apply migrations (creates the DB schema)
pnpm db:seed                  # demo clinics, users, pets and bookings
pnpm dev                      # http://localhost:3000
```

Useful scripts:

| Script | Purpose |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build and serve |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Lint, type-check, unit tests (vitest) |
| `pnpm db:migrate` | Create/apply a migration in development |
| `pnpm db:deploy` | Apply migrations (production) |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Browse the database |

Health check: `GET /api/health`.
