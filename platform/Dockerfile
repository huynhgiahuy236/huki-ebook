# ========================================================
# HUKI EBOOK - Backend Microservices Production Dockerfile
# Multi-stage build with security hardening (non-root user)
# ========================================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schemas and generate Prisma client bindings
COPY apps/identity-service/prisma ./apps/identity-service/prisma
COPY apps/business-service/prisma ./apps/business-service/prisma
COPY apps/commerce-service/prisma ./apps/commerce-service/prisma
COPY apps/shipping-service/prisma ./apps/shipping-service/prisma
COPY apps/promotion-service/prisma ./apps/promotion-service/prisma
COPY apps/analytics-service/prisma ./apps/analytics-service/prisma

RUN npm run prisma:generate

# Copy source code and build configs
COPY tsconfig*.json nest-cli.json nx.json ./
COPY libs ./libs
COPY apps ./apps

# Build all microservices
RUN npm run build

# Link @huki/shared so runtime resolves dist/libs/shared
RUN mkdir -p node_modules/@huki && ln -sfn ../../dist/libs/shared node_modules/@huki/shared

# Copy generated Prisma bindings to dist output directories
RUN for service in identity-service business-service commerce-service shipping-service promotion-service analytics-service; do \
      mkdir -p "dist/out-tsc/$service/apps/$service/prisma" && \
      cp -a "apps/$service/prisma/generated" "dist/out-tsc/$service/apps/$service/prisma/"; \
    done

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl dumb-init curl

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules and built artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps ./apps

# Create non-root user
USER node

# Default health check on gateway port (can be overridden per service)
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/health/live || exit 1

ENTRYPOINT ["dumb-init", "--"]

# Service name to run: defaults to api-gateway, can be set via SERVICE_NAME env
CMD ["node", "dist/out-tsc/api-gateway/apps/api-gateway/src/main.js"]
