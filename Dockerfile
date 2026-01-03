# ============================================
# DOCKERFILE PRODUCTION - NEXT.JS 16 + TURBOPACK
# ============================================

FROM node:20-alpine AS base

# Installation des dépendances système
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ============================================
# ÉTAPE 1 : INSTALLATION DÉPENDANCES
# ============================================
FROM base AS deps

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml* ./

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Installer les dépendances
RUN pnpm install --frozen-lockfile

# ============================================
# ÉTAPE 2 : BUILD DE L'APPLICATION
# ============================================
FROM base AS builder

WORKDIR /app

# Copier node_modules depuis deps
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source
COPY . .

# Variables d'environnement pour le build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js
RUN corepack enable && corepack prepare pnpm@latest --activate && \
    pnpm build

# ============================================
# ÉTAPE 3 : RUNNER PRODUCTION
# ============================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Créer utilisateur non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Créer répertoire uploads
RUN mkdir -p /app/public/uploads/pdfs && \
    chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
