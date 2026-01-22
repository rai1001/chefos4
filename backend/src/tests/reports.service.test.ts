import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportGeneratorService } from '@/services/reports.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data, error }),
});

describe('ReportGeneratorService (PDF/Excel)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generates inventory PDF', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([
            { name: 'Ing', stock_current: 1, stock_min: 2, units: { abbreviation: 'kg' }, product_families: { name: 'F' }, suppliers: { name: 'S' } },
        ]) as any);
        const service = new ReportGeneratorService();
        const buf = await service.generateInventoryPDF(['org-1']);
        expect(Buffer.isBuffer(buf)).toBe(true);
    });

    it('generates inventory PDF with fallback fields and OK stock', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([
            { name: 'Ing', stock_current: 10, stock_min: 2, units: null, product_families: null, suppliers: null },
        ]) as any);
        const service = new ReportGeneratorService();
        const buf = await service.generateInventoryPDF(['org-1']);
        expect(Buffer.isBuffer(buf)).toBe(true);
    });

    it('throws when inventory PDF query fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')) as any);
        const service = new ReportGeneratorService();
        await expect(service.generateInventoryPDF(['org-1'])).rejects.toThrow();
    });

    it('generates inventory Excel', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([
            { name: 'Ing', stock_current: 1, stock_min: 2, cost_price: 3, units: { abbreviation: 'kg' }, product_families: { name: 'F' }, suppliers: { name: 'S' } },
        ]) as any);
        const service = new ReportGeneratorService();
        const buf = await service.generateInventoryExcel(['org-1']);
        expect(Buffer.isBuffer(buf)).toBe(true);
    });

    it('throws when inventory Excel query fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')) as any);
        const service = new ReportGeneratorService();
        await expect(service.generateInventoryExcel(['org-1'])).rejects.toThrow();
    });
});
