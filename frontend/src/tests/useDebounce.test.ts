import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return the initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));
        expect(result.current).toBe('initial');
    });

    it('should update the value after the specified delay', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        });

        // Update the value
        rerender({ value: 'updated', delay: 500 });

        // Value should not be updated yet
        expect(result.current).toBe('initial');

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Value should be updated now
        expect(result.current).toBe('updated');
    });

    it('should reset the timer if value changes within the delay', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        });

        // Update value to 'first update'
        rerender({ value: 'first update', delay: 500 });

        // Advance time partially
        act(() => {
            vi.advanceTimersByTime(250);
        });

        // Should still be initial
        expect(result.current).toBe('initial');

        // Update value to 'second update' before timer finishes
        rerender({ value: 'second update', delay: 500 });

        // Advance time by another 250ms (total 500ms since start, but only 250ms since last update)
        act(() => {
            vi.advanceTimersByTime(250);
        });

        // Should still be initial because the timer reset
        expect(result.current).toBe('initial');

        // Advance remaining time
        act(() => {
            vi.advanceTimersByTime(250);
        });

        // Now it should be 'second update'
        expect(result.current).toBe('second update');
    });
});
