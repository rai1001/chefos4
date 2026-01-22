import { describe, it, expect } from 'vitest';
import { ExpiryOCRService } from '@/services/expiry-ocr.service';

describe('ExpiryOCRService', () => {
    it('extracts full dates and ISO dates', () => {
        const text = 'CAD 12/02/2026 LOTE 1234 FECHA 2026-03-01';
        const candidates = ExpiryOCRService.extractCandidates(text);

        const dates = candidates.map((c) => c.date);
        expect(dates).toContain('2026-02-12');
        expect(dates).toContain('2026-03-01');
    });

    it('extracts month/year as first of month', () => {
        const text = 'VENCE 02/2027';
        const candidates = ExpiryOCRService.extractCandidates(text);
        expect(candidates[0].date).toBe('2027-02-01');
    });
});
