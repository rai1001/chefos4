## 2025-02-23 - Formula Injection in Excel Exports
**Vulnerability:** User-controlled input (e.g., ingredient names) was written directly to Excel files without sanitization, allowing Formula Injection (CSV Injection).
**Learning:** Even with an ORM/Query Builder, data exported to formats like Excel/CSV acts as a sink that requires specific output encoding/sanitization. Also, Supabase clients in this codebase were not throwing errors on failure, leading to silent failures (empty reports).
**Prevention:** Always wrap user input in `sanitizeForExcel` before writing to Excel/CSV. Ensure Supabase service calls explicitly check `if (error) throw error`.
