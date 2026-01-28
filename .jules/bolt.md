## 2026-01-28 - [Frontend Search Debouncing]
**Learning:** The codebase frequently maps search input state directly to API query parameters without debouncing. This causes excessive API calls on every keystroke.
**Action:** When working on list views (Ingredients, Suppliers, etc.), always check for `useQuery` hooks being fed raw state variables and introduce `useDebounce`.
