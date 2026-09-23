# PetPass

Pet health, all in one place: keep a health record for every pet, find nearby vets, niche specialists (physiotherapy, reptile and avian care, behaviour, nutrition) and groomers, book online video consultations or in-person visits, and share a pet's history with the clinics you trust.

## What's inside

| Area | Highlights |
|---|---|
| Owners | Pets with vaccinations, medications, conditions, visit notes and documents · vaccination reminders · booking flow with live slots · video-call join button · per-clinic record sharing with expiry and one-click revoke |
| Clinics / providers | Onboarding with Google Places address lookup · services with price, duration, delivery mode (online, in person, home visit) and supported species · weekly hours per clinic or staff member, time off · booking requests to confirm/decline/complete · meeting links for online consults · patients list and records the owner has shared · staff management |
| Admin | Clinic verification (pending → verified/rejected/suspended) · service category taxonomy · user roles |
| Public | Landing page · nearest-clinic search with map, distance, category, species and format filters · clinic profiles with hours and bookable services |
| Platform | Installable PWA with offline fallback · security headers and CSP · role-gated areas via Next.js Proxy plus server-side checks on every page and action |

## Stack

Next.js 16 (App Router, React 19, TypeScript 6) · Tailwind CSS 4 · Prisma 7 + PostgreSQL · Auth.js v5 (email/password + Google) · Google Maps Platform · Vitest + Playwright · Railway (Docker)

All dependency versions are pinned exactly in `package.json`.

## Local development

Requirements: Node 24 (LTS), pnpm 10, and PostgreSQL 16+ (Docker Compose file included).

```bash
pnpm install
cp .env.example .env            # set AUTH_SECRET (openssl rand -base64 32); add Google keys if you have them
docker compose up -d db          # Postgres on localhost:5432
pnpm db:migrate                  # apply migrations
pnpm db:seed                     # demo clinics, users, pets, records, bookings
pnpm dev                         # http://localhost:3000
```

Demo accounts (password `Password123!`):

| Account | Role |
|---|---|
| owner@petpass.dev | Pet owner with Biscuit (dog), Mochi (cat) and Rex (bearded dragon) |
| provider1@petpass.dev / staff1@petpass.dev | Camden Paws Veterinary (owner / staff) |
| provider2@petpass.dev | Shoreditch Exotics & Avian |
| provider3@petpass.dev | Battersea Rehab & Behaviour |
| provider4@petpass.dev | Greenwich Grooming Studio |
| provider5@petpass.dev | Islington Vets (pending verification) |
| admin@petpass.dev | Admin |

Without Google Maps keys the app still works: the map shows a placeholder, address search falls back to typed addresses with manual coordinates, and search accepts a latitude/longitude.

### Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Dev server, production build, production server |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | ESLint, TypeScript, unit tests (slot generation, booking transitions, record access, geo) |
| `pnpm e2e` | Playwright smoke tests against a running, seeded app (`E2E_BASE_URL`, default `http://localhost:3000`) |
| `pnpm db:migrate` / `pnpm db:deploy` | Create a migration in development / apply migrations in production |
| `pnpm db:seed` / `pnpm db:studio` / `pnpm db:reset` | Seed demo data / browse the DB / drop and recreate |
| `pnpm db:race-check` | Integration check that concurrent bookings of one slot yield a single booking |

## Configuration

See `.env.example` for every variable. The important ones:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret for session tokens |
| `AUTH_URL` | **Must be the public URL of the app** (e.g. `https://petpass.up.railway.app`). Auth.js derives redirect URLs from it; a mismatch sends users to the wrong host after login. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Optional. Google OAuth client. Authorised redirect URI: `<AUTH_URL>/api/auth/callback/google` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional. Browser key restricted by HTTP referrer, with Maps JavaScript API and Places API (New) enabled. Baked in at build time. |
| `GOOGLE_MAPS_SERVER_KEY` | Optional. Server key with the Geocoding API enabled, used when a clinic saves its address. |
| `UPLOADS_DIR` | Directory for uploaded pet documents. Use a persistent volume in production. |
| `SEED_DEMO` | `true` seeds demo accounts and clinics; set `false` to seed only the service taxonomy. |

### Google Cloud setup

1. Create a project and enable **Maps JavaScript API**, **Places API (New)** and **Geocoding API**.
2. Create a browser key (restrict to your domains) for `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and a server key (restrict by IP or API) for `GOOGLE_MAPS_SERVER_KEY`.
3. For Google sign-in, create an OAuth 2.0 client (Web application) and add `<AUTH_URL>/api/auth/callback/google` as an authorised redirect URI.

## Deploying to Railway

The repo ships a multi-stage `Dockerfile` and `railway.json`. On start the container applies migrations (`prisma migrate deploy`) and then serves the app; the health check is `GET /api/health`.

1. Create a Railway project and add a **PostgreSQL** service.
2. Add a service from this GitHub repository. Railway detects the Dockerfile.
3. Set variables on the app service:
   - `DATABASE_URL` → reference the Postgres service's `DATABASE_URL`
   - `AUTH_SECRET`, `AUTH_TRUST_HOST=true`
   - `AUTH_URL` and `NEXT_PUBLIC_APP_URL` → your public domain (generate one under Settings → Networking first)
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_SERVER_KEY`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` as needed
   - `UPLOADS_DIR=/data/uploads`
4. Add a **Volume** mounted at `/data` so uploaded documents survive deploys.
5. Deploy. To load demo data once, set `RUN_SEED_ON_START=true` for a single deploy (or run `railway run pnpm db:seed` locally against the Railway database), then remove it.
6. Add the Railway domain to your Google OAuth redirect URIs and Maps key referrer restrictions.

`NEXT_PUBLIC_*` values are compiled into the client bundle, so changing them requires a redeploy.

## How the pieces fit

- `src/proxy.ts` (Next.js 16 Proxy, formerly middleware) redirects signed-out users to login and keeps owners, providers and admins in their own areas. It is an optimistic check only: every page and server action re-checks the session and ownership on the server (`src/lib/auth-helpers.ts`, `src/lib/authz/records.ts`).
- Record access is a pure, unit-tested decision (`decidePetAccess`): owners always read/write; admins read; providers act through an active grant to a clinic they belong to (`READ` or `READ_WRITE`).
- Availability is stored as weekly rules in the clinic's time zone plus UTC time-off blocks. `generateSlots` converts each boundary independently, so daylight-saving days are handled, and removes bookings (with service buffers) and blocks. Booking creation re-validates the slot and takes a per-clinic advisory lock inside a transaction to prevent double booking.
- Booking status changes follow a table in `src/lib/booking/transitions.ts` that encodes who may do what and when (for example owners can cancel online only up to 24 hours before).
- Uploaded documents are served through `GET /api/documents/[id]`, which applies the same access rules as the record pages.
