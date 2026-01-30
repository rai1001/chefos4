## 2025-05-23 - Formula Injection in Excel Exports
**Vulnerability:** User-controlled input (ingredient names, supplier names, etc.) was written directly to Excel cells without sanitization, allowing for Formula Injection (CSV Injection) attacks if an admin opens the report.
**Learning:** ExcelJS does not automatically sanitize input against formula injection. Any application generating Excel/CSV files from user input must explicitly escape characters like `=`, `+`, `-`, `@`.
**Prevention:** Use a dedicated sanitizer function (like `sanitizeForExcel`) to prepend `'` to strings starting with dangerous characters before writing them to the workbook.
