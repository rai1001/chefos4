## 2025-02-18 - Auth Bypass on DB Failure
**Vulnerability:** A "Fail Open" mechanism in authentication middleware allowed users to log in with an empty organization list if the `organization_members` table query failed (e.g., table missing).
**Learning:** "TEMPORAL" workarounds for infrastructure issues often become permanent security holes. Authentication logic must always "Fail Closed" - if we can't verify permissions, access is denied.
**Prevention:** Review all error handling in auth flows. Ensure that any exception results in a deny by default.
