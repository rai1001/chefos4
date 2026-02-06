## 2026-02-06 - Shadcn/ui Button Accessibility
**Learning:** Shadcn/ui `Button` components do not automatically generate accessible labels for icon-only variants. `iconOnly` prop is visual only.
**Action:** Always add explicit `aria-label` to any `Button` that contains only an icon to ensure screen reader support.
