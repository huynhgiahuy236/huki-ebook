# HUKI EBOOK — Production Deployment & Rollback Runbook

## 1. Quality Gates & CI Pipeline

Every push to `main` or `develop` triggers `.github/workflows/ci.yml` which executes three mandatory quality gates:

1. **Backend Quality Gate**:
   - `npm ci`
   - `npm run prisma:generate`
   - `npm run build` (tsc compilation across all 8 microservices and shared contract library)
   - `npm test -- --runInBand` (Unit & contract test suites)
2. **Frontend Quality Gate**:
   - `npm ci`
   - `npm run check` (TypeScript typecheck & ESLint 9 validation)
   - `npm test` (Vitest unit and component tests)
   - `npm run build` (Turbopack production build)
3. **Integrity & Schema Gate**:
   - Validation of all Prisma schemas across all services (`npx prisma validate`)
   - Rejection of any unvalidated or conflicting database schema changes.

Deployment is **strictly blocked** if any quality gate fails.

---

## 2. Staging Deployment (`develop` branch)

1. Commits merged to `develop` trigger `.github/workflows/deploy-staging.yml`.
2. Staging uses dedicated databases (`huki_staging_*`) and ports to prevent interference.
3. Automated smoke tests (`scripts/deploy/smoke-test.mjs`) verify all health routes and core workflows before changes are promoted to `main`.

---

## 3. Production Deployment (`main` branch)

Production deployment is executed via `.github/workflows/deploy.yml`:

```bash
# 1. Strict migration execution (FAIL FAST: NO || true)
npm run prisma:migrate:deploy

# 2. PM2 zero-downtime reload
pm2 restart api-gateway identity-service business-service commerce-service shipping-service community-service promotion-service analytics-service --update-env

# 3. Post-deploy health probe verification
curl --fail http://127.0.0.1:3000/api/v1/health/live
curl --fail http://127.0.0.1:3000/api/v1/health/services
```

---

## 4. Rollback Procedure

When a release fails post-deployment health checks or monitoring triggers critical alerts:

### Quick Rollback (Automated)

Execute the standardized rollback script:
```bash
./scripts/deploy/rollback.sh HEAD~1
```

### Manual Rollback Steps

1. **Check out previous stable commit**:
   ```bash
   git checkout <stable-tag-or-commit>
   ```
2. **Recompile platform**:
   ```bash
   cd platform && npm ci && npm run prisma:generate && npm run build
   ```
3. **Restart processes**:
   ```bash
   pm2 restart all --update-env
   ```
4. **If database schema requires rollback**:
   ```bash
   node scripts/backup/test-restore-drill.mjs
   # Or restore from daily snapshot:
   gunzip < backups/postgres/<date>/huki_<service>.sql.gz | psql -U postgres -d huki_<service>
   ```
5. **Execute smoke test**:
   ```bash
   node scripts/deploy/smoke-test.mjs
   ```

---

## 5. Observability Stack

The platform is monitored by Prometheus, Loki, Promtail, Tempo, and Grafana:
- Start observability stack:
  ```bash
  docker compose -f docker-compose.observability.yml up -d
  ```
- **Grafana**: `http://localhost:3101` (Dashboards for Gateway metrics, latency, error rate)
- **Prometheus**: `http://localhost:9090` (Scrapes `/metrics` from services)
- **Loki**: Log aggregation with correlation IDs (`x-correlation-id`)
- **Tempo**: Distributed tracing via OpenTelemetry endpoints (`4317` / `4318`).
