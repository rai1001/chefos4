import { describe, it, expect, vi } from 'vitest';
import { AnalyticsController } from '@/controllers/analytics.controller';

const mockService = {
    getGlobalKPIs: vi.fn(),
    getInventoryValuation: vi.fn(),
    getConsumptionTrends: vi.fn(),
    getFoodCostMetrics: vi.fn(),
};

vi.mock('@/services/analytics.service', () => ({
    AnalyticsService: vi.fn().mockImplementation(() => mockService),
}));

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('AnalyticsController', () => {
    it('returns dashboard stats', async () => {
        const controller = new AnalyticsController();
        const req: any = { user: { organizationIds: ['org-1'] } };
        const res = mockRes();

        mockService.getGlobalKPIs.mockResolvedValue({ total: 1 });
        mockService.getInventoryValuation.mockResolvedValue([{ family: 'A' }]);
        mockService.getConsumptionTrends.mockResolvedValue([{ day: '2024-01-01' }]);
        mockService.getFoodCostMetrics.mockResolvedValue([{ event: 'E1' }]);

        await controller.getDashboardStats(req, res);

        expect(res.json).toHaveBeenCalledWith({
            kpis: { total: 1 },
            valuation: [{ family: 'A' }],
            trends: [{ day: '2024-01-01' }],
            foodCost: [{ event: 'E1' }],
        });
    });

    it('handles errors', async () => {
        const controller = new AnalyticsController();
        const req: any = { user: { organizationIds: ['org-1'] } };
        const res = mockRes();

        mockService.getGlobalKPIs.mockRejectedValue(new Error('boom'));

        await controller.getDashboardStats(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch analytics data' });
    });
});
