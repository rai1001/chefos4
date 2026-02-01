## 2024-05-22 - [Accessibility] Icon-only Buttons
**Learning:** Reusable button components often support icon-only modes but don't enforce `aria-label`, leading to silent accessibility failures in lists/tables.
**Action:** Always verify icon-only buttons have descriptive `aria-label`s and use `getByRole('button', { name: ... })` in tests to enforce it.
