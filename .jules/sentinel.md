## 2024-05-22 - Formula Injection in Excel Exports
**Vulnerability:** Users could inject formulas (e.g., starting with `=`) into input fields (ingredients, suppliers, etc.) which would then be executed by Excel when an admin opens the exported report.
**Learning:** ExcelJS does not automatically sanitize input or escape formulas. Explicit sanitization is required for user-controlled data in spreadsheets.
**Prevention:** Use `sanitizeForExcel` utility to prepend `'` to any string starting with `=`, `+`, `-`, or `@`.
