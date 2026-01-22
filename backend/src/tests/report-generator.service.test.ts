import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportGeneratorService } from '@/services/report-generator.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data, error }),
});

describe('ReportGeneratorService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generates inventory excel', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([
            { name: 'Tomate', cost_price: 1, stock_min: 2, unit: { name: 'kg' }, family: { name: 'Veg' }, supplier: { name: 'Supp' } },
        ]) as any);
        const service = new ReportGeneratorService();
        const buf = await service.generateInventoryExcel('org-1');
        expect(Buffer.isBuffer(buf)).toBe(true);
    });

    it('uses fallback values when inventory data is missing', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([
            { name: 'Item', cost_price: 2, stock_min: null, unit: null, family: null, supplier: null },
        ]) as any);
        const service = new ReportGeneratorService();
        const buf = await service.generateInventoryExcel('org-1');
        expect(Buffer.isBuffer(buf)).toBe(true);
    });

    it('throws when inventory query fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')) as any);
        const service = new ReportGeneratorService();
        await expect(service.generateInventoryExcel('org-1')).rejects.toThrow();
    });

    it('generates production excel', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([
            { title: 'Prep', status: 'PENDING', priority: 'HIGH', scheduled_start: new Date().toISOString(), scheduled_end: new Date().toISOString(), estimated_duration_minutes: 10, recipe: { name: 'R1' } },
        ]) as any);
        const service = new ReportGeneratorService();
        const buf = await service.generateProductionExcel('evt-1');
        expect(Buffer.isBuffer(buf)).toBe(true);
    });

    it('throws when production query fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')) as any);
        const service = new ReportGeneratorService();
        await expect(service.generateProductionExcel('evt-1')).rejects.toThrow();
    });
});
