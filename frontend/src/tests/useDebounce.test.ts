import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from '../hooks/useDebounce';

describe('useDebounce', () => {
    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));
        expect(result.current).toBe('initial');
    });

    it('should debounce value updates', () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        });

        // Update value
        rerender({ value: 'updated', delay: 500 });

        // Value should not update immediately
        expect(result.current).toBe('initial');

        // Advance timers by partial delay
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(result.current).toBe('initial');

        // Advance timers by remaining delay
        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(result.current).toBe('updated');

        vi.useRealTimers();
    });

    it('should reset timer on value change', () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        });

        // First update
        rerender({ value: 'update1', delay: 500 });

        // Advance partial
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(result.current).toBe('initial');

        // Second update before timer fires
        rerender({ value: 'update2', delay: 500 });

        // Advance more time (total 400ms from start, but new timer started at 200ms)
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(result.current).toBe('initial');

        // Advance enough for second timer
        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(result.current).toBe('update2');

        vi.useRealTimers();
    });
});
