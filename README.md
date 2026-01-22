# CulinaryOS MVP

Kitchen management SaaS for professional environments.

## Project Structure

- `backend/`: Node.js + Express API
- `frontend/`: React + Vite + TailwindCSS
- `supabase/`: Migrations and Edge Functions
- `docs/`: Technical documentation

## Local Development

1. **Prerequisites**: Node.js 18+, Supabase CLI.
2. **Setup**:
   - Clone the repo.
   - Run `npm install` in the root.
   - Configure `.env` in `backend/` and `frontend/`.
3. **Run**:
   - `npm run dev` starts both backend and frontend.

## CI/CD

Automatic tests and linting on every PR via GitHub Actions.
Threshold for backend coverage: 90%.
