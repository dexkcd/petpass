#!/bin/sh
# Apply pending migrations, optionally seed, then start the Next.js server.
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

echo "==> Applying database migrations"
( cd /app/migrate && node node_modules/prisma/build/index.js migrate deploy )

if [ "$RUN_SEED_ON_START" = "true" ]; then
  echo "==> Seeding database (RUN_SEED_ON_START=true)"
  ( cd /app/migrate && node node_modules/tsx/dist/cli.mjs prisma/seed.ts )
fi

echo "==> Starting PetPass on port ${PORT:-3000}"
exec node server.js
