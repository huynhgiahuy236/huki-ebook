# Codex Phase 5 handoff

## Duplicate local migration baselines

- Issue: Identity, Business, and Shipping contain overlapping initial migrations. A clean `prisma migrate deploy` fails in Identity with `P3018` because `20260821000000_init` recreates `UserRole` from `20260817134927_init`.
- Service: Identity; likely Business and Shipping need the same audit.
- File: `platform/apps/*-service/prisma/migrations/*/migration.sql`
- Endpoint: Blocks database-backed integration flows, starting with `POST /api/v1/auth/register`.
- Severity: High.
- Proposal: Reconcile the migration history and document a reproducible clean local baseline. Do not mark duplicate migrations applied until their SQL/schema equivalence is verified.

## Business authentication contract is not enforced

- Issue: Protected Business endpoints accept `userId`/`adminId` query parameters and have no JWT guard. `GET /api/v1/businesses/my` without credentials reaches Prisma instead of returning 401.
- Service: Business.
- File: `platform/apps/business-service/src/modules/business/business.controller.ts`, plus Store/Member controllers and module auth wiring.
- Endpoint: `/api/v1/businesses/*`, `/api/v1/stores/*`, `/api/v1/members/*`.
- Severity: Critical.
- Proposal: Establish a Business JWT guard/current-user contract, replace caller-controlled identity query parameters, then rerun `test:integration`.

## Environment database names do not match Docker

- Issue: `platform/.env.example` uses `identity_db`, `business_db`, etc.; `docker-compose.yml` provisions `huki_identity`, `huki_business`, etc.
- Service: All PostgreSQL services.
- File: `platform/.env.example`, `docker-compose.yml`.
- Endpoint: Local startup/integration environment.
- Severity: High.
- Proposal: Pick one naming convention and align examples/dev guide without changing production secrets.

## Gateway route ownership collisions

- Issue: First-segment routing sends `/books/:id/reviews` to Commerce and `/stores/:id/reviews` to Business, while both controllers live in Community. `/admin/moderation` is also absent from the Gateway route map; `/internal/*` is owned by multiple services.
- Service: Gateway/Community and internal service routes.
- File: `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts` and affected controllers.
- Endpoint: Book/store reviews, admin moderation, internal routes.
- Severity: High.
- Proposal: Audit API inventory against route ownership and define explicit longest-prefix mappings before adding these flows to Gateway integration coverage.
