## 2025-02-18 - [Fixing Broken Test Environment]
**Learning:** The frontend test suite was broken due to missing files (`ExportButtons.tsx`, `RecordWasteForm.tsx`) and outdated test expectations (`components-ingredients.test.tsx`). Also `pnpm-workspace.yaml` was missing.
**Action:** Always run the full test suite (`pnpm test`) early to identify environment issues. Expect to fix existing tests when touching related files. Ensure workspace config exists.
