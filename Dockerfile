# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Fas-Nav.ch – Produktions-Image (Multi-Stage)
# ---------------------------------------------------------------------------

FROM node:22-alpine AS base
# libc6-compat wird von einigen nativen Abhängigkeiten (u.a. sharp) benötigt.
RUN apk add --no-cache libc6-compat openssl ffmpeg postgresql-client tar gzip
WORKDIR /app


# --- Abhängigkeiten ---------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci


# --- Build ------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Der Build benötigt eine gültige DATABASE_URL-Syntax, verbindet sich aber nicht.
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build


# --- Laufzeit ---------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Die Anwendung läuft nicht als root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Schema und generierter Client. Migrationen laufen nicht hier, sondern im
# Dienst "migrate" (siehe docker-compose.yml): Die Prisma-CLI benötigt einen
# grossen Teil der Entwicklungsabhängigkeiten, den dieses Image bewusst nicht
# mitbringt.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Uploads liegen im Volume und müssen beschreibbar sein.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
