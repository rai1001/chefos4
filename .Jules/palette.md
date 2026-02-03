## 2025-02-27 - Hidden Accessibility Gaps in Icon Buttons
**Learning:** Shadcn/ui `Button` component with `iconOnly` prop or just icon children does not enforce `aria-label`, leading to silent accessibility failures where buttons are invisible to screen readers.
**Action:** Always audit icon-only buttons for `aria-label` during component implementation or review, regardless of the UI library used.
