## 2026-02-04 - Frontend Testing with Fake Timers
**Learning:** `userEvent.type` combined with `vi.useFakeTimers` leads to timeouts because `userEvent` relies on real system time/promises.
**Action:** Use `fireEvent.change` for input simulation when testing debounce logic with fake timers.
