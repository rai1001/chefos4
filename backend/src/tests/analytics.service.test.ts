import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '@/services/analytics.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any, error: any = null, count: number | null = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data, error, count }),
});

describe('AnalyticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns inventory valuation', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ total_value: 10 }]));
        const service = new AnalyticsService();
        const data = await service.getInventoryValuation('org-1');
        expect(data).toEqual([{ total_value: 10 }]);
    });

    it('throws when inventory valuation fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));
        const service = new AnalyticsService();
        await expect(service.getInventoryValuation('org-1')).rejects.toThrow();
    });

    it('returns consumption trends', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ day: '2024-01-01' }]));
        const service = new AnalyticsService();
        const data = await service.getConsumptionTrends('org-1');
        expect(data).toEqual([{ day: '2024-01-01' }]);
    });

    it('throws when consumption trends fail', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));
        const service = new AnalyticsService();
        await expect(service.getConsumptionTrends('org-1')).rejects.toThrow();
    });

    it('returns food cost metrics', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ date_start: '2024-01-01' }]));
        const service = new AnalyticsService();
        const data = await service.getFoodCostMetrics('org-1');
        expect(data).toEqual([{ date_start: '2024-01-01' }]);
    });

    it('throws when food cost metrics fail', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));
        const service = new AnalyticsService();
        await expect(service.getFoodCostMetrics('org-1')).rejects.toThrow();
    });

    it('computes global KPIs', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'v_inventory_valuation') {
                return createChain([{ total_value: 10 }, { total_value: 20 }]);
            }
            if (table === 'ingredients') {
                return createChain([
                    { stock_current: 1, stock_min: 2 },
                    { stock_current: 0, stock_min: 0 },
                    { stock_current: 5, stock_min: 2 },
                ]);
            }
            if (table === 'purchase_orders') {
                return createChain([], null, 3);
            }
            return createChain([]);
        });

        const service = new AnalyticsService();
        const data = await service.getGlobalKPIs('org-1');
        expect(data).toEqual({
            total_valuation: 30,
            low_stock_count: 2,
            pending_pos: 3,
            active_events: 0,
        });
    });

    it('computes global KPIs with empty data', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'v_inventory_valuation') {
                return createChain(null);
            }
            if (table === 'ingredients') {
                return createChain([], null, null);
            }
            if (table === 'purchase_orders') {
                return createChain([], null, null);
            }
            return createChain([]);
        });

        const service = new AnalyticsService();
        const data = await service.getGlobalKPIs('org-1');
        expect(data).toEqual({
            total_valuation: 0,
            low_stock_count: 0,
            pending_pos: 0,
            active_events: 0,
        });
    });
});
