# CulinaryOS Architecture

## Technology Stack

### Backend
- **Core**: Node.js + Express + TypeScript.
- **Validation**: Zod for request body and environment variables.
- **Authentication**: JWT Based with Supabase as Auth/DB provider.
- **Logging**: Pino for structured logging.
- **Testing**: Vitest for unit and integration tests.

### Frontend
- **Framework**: React 18 + Vite.
- **State Management**: Zustand (Auth/UI) + TanStack Query (Server State).
- **Styling**: TailwindCSS with specialized kitchen-focused components.
- **Testing**: Playwright for end-to-end user flows.

### Database (Supabase / PostgreSQL)
- **Multi-tenancy**: Organization-based data isolation via Row Level Security (RLS).
- **Schema**: 15+ tables covering Ingredients, Recipes, Events, and Purchase Orders.

## Core Services
- `PurchaseCalculatorService`: Handles safety buffer and requirement calculations.
- `DeliveryEstimatorService`: Predicts delivery dates based on supplier lead times and cut-offs.

## CI/CD
- **Linting**: Strict ESLint + Prettier rules.
- **Pipeline**: GitHub Actions for automated testing and coverage (90% threshold).
- **Deployment**: Configured for Vercel (Frontend) and Supabase Edge Functions (Backend).
