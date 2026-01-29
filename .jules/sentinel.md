# Sentinel's Journal

## 2025-10-26 - Formula Injection in Excel Reports
**Vulnerability:** User input (names, titles) was directly written to Excel cells using `ExcelJS`, allowing Formula Injection (CSV Injection) if the input started with `=`, `+`, `-`, or `@`.
**Learning:** `ExcelJS` does not automatically sanitize strings for formula injection. Explicit sanitization is required. Also, the report service was swallowing errors, leading to silent failures and empty reports.
**Prevention:** Use `sanitizeForExcel` helper from `backend/src/utils/sanitizers.ts` for all user-controlled fields before writing to Excel/CSV. Ensure services throw or handle errors explicitly.
