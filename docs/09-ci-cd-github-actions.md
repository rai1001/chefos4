# 🚀 CI/CD & GitHub Actions

This guide documents the Continuous Integration (CI) and Continuous Deployment (CD) pipelines configured for ChefOS via GitHub Actions.

## Overview

The pipelines are designed to ensure code quality and automate deployments:
- **CI Pipeline (`ci.yml`)**: Runs on Pull Requests and Pushes to `main`/`develop`. It verifies the codebase via linting (frontend), type-checking, and tests.
- **Deploy Pipeline (`deploy.yml`)**: Runs on Pushes to `main`. It deploys the backend to Supabase and the frontend to Vercel.

---

## 🛠️ CI Pipeline (`.github/workflows/ci.yml`)

### Triggers
- **Push**: `main`, `develop`
- **Pull Request**: `main`, `develop`

### Jobs

#### 1. Backend Tests (`backend-tests`)
Runs validation for the Node.js/Express backend.
*Note: Linting is currently not configured for the backend.*

- **Environment**: `ubuntu-latest`
- **Node Version**: `18`
- **Steps**:
  1. **Checkout Code**: Uses `actions/checkout@v4`.
  2. **Install Dependencies**: `npm ci`
  3. **Build & Type Check**: `npm run build` (runs `tsc` config check).
  4. **Run Tests**: `npm run test` (runs `vitest`).
  5. **Coverage Check** (Optional): Verifies code coverage thresholds if configured.

#### 2. Frontend Tests (`frontend-tests`)
Runs validation for the React/Vite frontend.

- **Environment**: `ubuntu-latest`
- **Node Version**: `18`
- **Steps**:
  1. **Checkout Code**: Uses `actions/checkout@v4`.
  2. **Install Dependencies**: `npm ci`
  3. **Linting**: `npm run lint` (ESLint).
  4. **Type Check**: `npm run type-check` (TypeScript validation).
  5. **Unit Tests**: `npm run test` (Vitest).
  6. **Build Check**: `npm run build` (Verifies production build succeeds).

#### 3. E2E Tests (`e2e-tests`)
Runs full end-to-end tests using Playwright. configuration.
*Depends on*: `backend-tests`, `frontend-tests`.

- **Steps**:
  1. **Install Playwright**: `npx playwright install --with-deps`
  2. **Run Tests**: `npm run test:e2e`
  3. **Artifacts**: Uploads Playwright report on failure.

---

## 🚀 Deploy Pipeline (`.github/workflows/deploy.yml`)

### Triggers
- **Push**: `main` (Production release)

### Jobs

#### 1. Deploy Backend (`deploy-backend`)
Deploys Supabase Edge Functions.

- **Secrets Required**: `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`
- **Command**:
  ```bash
  supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
  ```

#### 2. Deploy Frontend (`deploy-frontend`)
Deploys the web application to Vercel.

- **Secrets Required**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- **Action**: `amondnet/vercel-action`
- **Arguments**: `--prod`

---

## 🔑 Secret Configuration

To enable these pipelines, configure the following **Repository Secrets** in GitHub (Settings > Secrets and variables > Actions):

| Secret Name | Description | Required By |
| :--- | :--- | :--- |
| `SUPABASE_ACCESS_TOKEN` | Access token for Supabase CLI | `deploy-backend` |
| `SUPABASE_PROJECT_REF` | Supabase Project ID | `deploy-backend` |
| `VERCEL_TOKEN` | Vercel API Token | `deploy-frontend` |
| `VERCEL_ORG_ID` | Vercel Organization ID | `deploy-frontend` |
| `VERCEL_PROJECT_ID` | Vercel Project ID | `deploy-frontend` |

---

## 📜 Workflow Code Reference

### `ci.yml` Structure
```yaml
name: CI
on: [push, pull_request]
jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build # Type-check
      - run: npm run test
```

### `deploy.yml` Structure
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy-backend:
    steps:
      - run: supabase functions deploy
  deploy-frontend:
    steps:
      - uses: amondnet/vercel-action@v25
```
