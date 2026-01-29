import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
    it('should return the initial value', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));
        expect(result.current).toBe('initial');
    });

    it('should debounce the value update', async () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
            initialProps: { value: 'initial' },
        });

        rerender({ value: 'updated' });

        // Should not have updated yet
        expect(result.current).toBe('initial');

        // Advance timers
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe('updated');
        vi.useRealTimers();
    });
});
