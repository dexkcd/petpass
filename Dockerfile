# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# PetPass production image (Railway). Multi-stage: install -> build -> run.
# The runtime image contains the Next.js standalone server plus a small,
# separate Prisma CLI install used only to apply migrations on start.
# ---------------------------------------------------------------------------

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl && corepack enable
WORKDIR /app

# ---- dependencies ----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build -----------------------------------------------------------------
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public build-time vars (baked into the client bundle). Pass with
# `docker build --build-arg ...`; Railway forwards service variables as build args.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# prisma.config.ts requires DATABASE_URL just to load; generation and the
# Next.js build never connect, so a placeholder is enough at image-build time.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm exec prisma generate && pnpm exec next build

# ---- migration toolchain (flat npm install, independent of pnpm layout) ----
FROM base AS migrate
WORKDIR /app/migrate
RUN npm init -y >/dev/null \
  && npm install --no-audit --no-fund --omit=dev \
       prisma@7.10.0 @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg@8.23.0 dotenv@18.0.3 tsx@4.23.15 bcryptjs@3.0.3
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY src/lib/categories.ts ./src/lib/categories.ts
# Generate the client here (src/generated is gitignored and not in the build
# context); the seed imports it from ../src/generated/prisma/client.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN node node_modules/prisma/build/index.js generate

# ---- runtime ---------------------------------------------------------------
FROM node:24-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOADS_DIR=/data/uploads

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=migrate /app/migrate ./migrate
COPY docker/entrypoint.sh ./entrypoint.sh

RUN mkdir -p /data/uploads && chown -R node:node /app /data && chmod +x ./entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1
CMD ["./entrypoint.sh"]
