# 🚀 CI/CD Pipeline

GitHub Actions CI/CD setup.

## 📁 Workflow Files

```
.github/
├── workflows/
│   ├── ci.yml           # Continuous Integration
│   ├── cd-staging.yml   # Staging Deployment
│   ├── cd-production.yml # Production Deployment
│   └── scheduled.yml     # Scheduled jobs
│
└── workflows/
    ├── docker-build.yml
    └── security-scan.yml
```

## CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================
  # LINT & TYPE CHECK
  # ============================================
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript type check
        run: npm run typecheck

  # ============================================
  # UNIT TESTS
  # ============================================
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_huki
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_huki
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  # ============================================
  # E2E TESTS
  # ============================================
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: test
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_huki
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

      rabbitmq:
        image: rabbitmq:3-management
        ports:
          - 5672:5672
          - 15672:15672

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_huki
          REDIS_URL: redis://localhost:6379
          RABBITMQ_URL: amqp://guest:guest@localhost:5672

      - name: Upload E2E test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

## Staging Deployment

```yaml
# .github/workflows/cd-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================
  # BUILD IMAGES
  # ============================================
  build:
    name: Build Docker Images
    runs-on: ubuntu-latest
    
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      digest: ${{ steps.build.outputs.digest }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=,suffix=,format=short
            type=ref,event=branch
            type=raw,value=staging

      - name: Build and push API Gateway
        uses: docker/build-push-action@v5
        with:
          context: ./services/api-gateway
          push: true
          tags: ${{ steps.meta.outputs.tags }}-api-gateway
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push Identity Service
        uses: docker/build-push-action@v5
        with:
          context: ./services/identity-service
          push: true
          tags: ${{ steps.meta.outputs.tags }}-identity-service

      # ... similar for other services

  # ============================================
  # DEPLOY TO STAGING
  # ============================================
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    
    environment:
      name: staging
      url: https://staging.huki-ebook.com

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v1
        with:
          namespace: staging
          manifests: |
            k8s/staging/
          images: |
            ${{ needs.build.outputs.image-tag }}-api-gateway:${{ github.sha }}
            ${{ needs.build.outputs.image-tag }}-identity-service:${{ github.sha }}
          sets: |
            image.repository=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}

      - name: Health check
        run: |
          curl -f https://staging.huki-ebook.com/health || exit 1

      - name: Notify deployment
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Deployed to staging: ${{ github.sha }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Production Deployment

```yaml
# .github/workflows/cd-production.yml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version tag (e.g., v1.2.3)'
        required: true

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================
  # PRE-DEPLOY CHECKS
  # ============================================
  pre-deploy:
    name: Pre-deployment Checks
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run database migrations
        run: |
          echo "Running migrations..."
          npm run migrate:prod

      - name: Backup database
        run: |
          echo "Creating backup..."
          # Backup logic here

      - name: Notify start
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Starting production deployment: ${{ github.event.inputs.version }}"
            }

  # ============================================
  # DEPLOY TO PRODUCTION
  # ============================================
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: pre-deploy
    
    environment:
      name: production
      url: https://huki-ebook.com

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy
        run: |
          echo "Deploying version: ${{ github.event.inputs.version }}"
          # Deployment commands

      - name: Health check
        run: |
          for i in {1..5}; do
            if curl -f https://api.huki-ebook.com/health; then
              echo "Health check passed"
              exit 0
            fi
            echo "Attempt $i failed, retrying..."
            sleep 10
          done
          exit 1

  # ============================================
  # POST-DEPLOY VERIFICATION
  # ============================================
  verify:
    name: Post-deployment Verification
    runs-on: ubuntu-latest
    needs: deploy
    
    steps:
      - name: Run smoke tests
        run: |
          npm run test:smoke -- --env=production

      - name: Notify success
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "✅ Production deployment successful: ${{ github.event.inputs.version }}"
            }

      - name: Notify failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "❌ Production deployment failed: ${{ github.event.inputs.version }}"
            }
```

## Environment Variables

```yaml
# GitHub Secrets
DATABASE_URL: postgresql://...
REDIS_URL: redis://...
RABBITMQ_URL: amqp://...

# Container Registry
GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

# Slack
SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

# Kubernetes
KUBECONFIG: ${{ secrets.KUBE_CONFIG_STAGING }}
```
