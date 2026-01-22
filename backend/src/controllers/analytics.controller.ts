import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { AnalyticsService } from '@/services/analytics.service';
import { logger } from '@/utils/logger';

export class AnalyticsController {
    private analyticsService = new AnalyticsService();

    async getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const organizationId = req.user!.organizationIds[0];

            const [kpis, valuation, trends, foodCost] = await Promise.all([
                this.analyticsService.getGlobalKPIs(organizationId),
                this.analyticsService.getInventoryValuation(organizationId),
                this.analyticsService.getConsumptionTrends(organizationId),
                this.analyticsService.getFoodCostMetrics(organizationId),
            ]);

            res.json({
                kpis,
                valuation,
                trends,
                foodCost
            });
        } catch (error) {
            logger.error('Error fetching dashboard stats:', error);
            res.status(500).json({ error: 'Failed to fetch analytics data' });
        }
    }
}
