import { describe, expect, it } from 'vitest';
import { VacationCalculatorService } from '@/services/vacation-calculator.service';

describe('VacationCalculatorService', () => {
    const service = new VacationCalculatorService();

    it('counts calendar days inclusive', () => {
        const days = service.calculateDays('2026-01-01', '2026-01-05', 'CALENDAR');
        expect(days).toBe(5);
    });

    it('skips weekends for business policy', () => {
        const days = service.calculateDays('2026-01-02', '2026-01-05', 'BUSINESS');
        expect(days).toBe(2);
    });
});
