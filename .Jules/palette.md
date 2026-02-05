## 2025-05-24 - Missing Components Blocking Build
**Learning:** The frontend build fails because `ExportButtons.tsx` and `RecordWasteForm.tsx` are imported but missing. Creating stubs fixes the build and allows verifying other changes.
**Action:** When encountering `[plugin:vite:import-analysis]` errors for missing files, check if they are expected to exist or if they are missing stubs.

## 2025-05-24 - Low Stock Indicator Pattern
**Learning:** `IngredientsList` had data for low stock (`stock_current`, `stock_min`) but no visual indicator, despite test expectations. Implementing a simple `Badge` restored the expected behavior and improved UX.
**Action:** Before removing failing test assertions, check if the missing feature can be easily implemented with available data.
