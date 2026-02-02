## 2024-05-23 - Accessibility in Data Tables
**Learning:** Icon-only action buttons (Edit/Delete) in tables often lack accessible names, making them invisible to screen reader users who only hear "button".
**Action:** Always add `aria-label` to `Button` components when using the `iconOnly` prop or when the button has no visible text.
