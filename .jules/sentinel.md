## 2024-05-22 - Fail-Open Auth Bypass
**Vulnerability:** Found a "TEMPORAL" block in `auth.middleware.ts` that allowed users to bypass organization checks if the database returned a specific error (`PGRST205`). This "fail open" behavior compromised the integrity of the authorization model.
**Learning:** Temporary workarounds for infrastructure issues (like missing tables) often persist in production code and create security holes. Code comments labeled "TEMPORAL" or "TODO" in security-critical paths are red flags.
**Prevention:** Always implement "Fail Secure" (or "Fail Closed") logic. If a dependency (DB) fails, the request must fail. Never assume a default safe state (like empty permissions) when an error occurs.
