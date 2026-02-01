## 2026-02-01 - Excel/CSV Formula Injection
**Vulnerability:** User input starting with `=`, `+`, `-`, or `@` in Excel exports could execute formulas (Formula Injection).
**Learning:** ExcelJS does not automatically sanitize input. Explicit sanitization is required for all user-generated content in exports.
**Prevention:** Use `sanitizeForExcel` from `backend/src/utils/sanitizers.ts` for all CSV/Excel exports.
