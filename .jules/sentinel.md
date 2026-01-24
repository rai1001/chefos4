## 2026-01-24 - Missing Input Validation Pattern
**Vulnerability:** Multiple inventory endpoints (stock-out, locations, etc.) lacked any input validation middleware, relying solely on controller logic or database constraints.
**Learning:** The project uses Zod for validation but it was inconsistently applied. Developers might assume Supabase handles type safety, but business logic constraints (positive quantities, valid enums) were missed.
**Prevention:** Enforce a rule that ALL POST/PATCH/PUT routes must have a `validate()` middleware attached.
