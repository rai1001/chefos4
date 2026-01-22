import { describe, expect, it } from 'vitest';
import { calculateVariance, formatAdjustmentNote } from '@/services/cycle-count.service';

describe('CycleCountService helpers', () => {
    it('calculates variance as counted minus expected', () => {
        expect(calculateVariance(10, 8)).toBe(-2);
        expect(calculateVariance(5, 5)).toBe(0);
        expect(calculateVariance(4, 9)).toBe(5);
    });

    it('formats adjustment notes with sign', () => {
        expect(formatAdjustmentNote('Recuento Camara', 3)).toBe('Cycle count "Recuento Camara": +3');
        expect(formatAdjustmentNote('Recuento Camara', -2)).toBe('Cycle count "Recuento Camara": -2');
    });
});
