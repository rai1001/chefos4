# Sentinel Journal

## 2024-05-22 - CSV Injection Prevention
**Vulnerability:** CSV Injection (Formula Injection) in file imports.
**Learning:** User input in CSVs can contain malicious formulas (starting with `=`, `+`, `-`, `@`, `\t`, `\r`) that execute when opened in spreadsheet software (DDE injection), leading to RCE or data exfiltration.
**Prevention:** Sanitize all untrusted CSV values by prepending a single quote (`'`) to escape dangerous characters. Implemented in `backend/src/utils/csv-validator.ts`.
