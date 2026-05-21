# ─── Stage 1: Install deps ──────────────────────────────────────────────
FROM node:24-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts

# ─── Stage 2: Build ─────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── Stage 3: Production runner ─────────────────────────────────────────
FROM node:24-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_SHARP_PATH=/app/node_modules/sharp

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Pull standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
