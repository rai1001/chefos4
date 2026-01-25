import { Request, Response } from 'express';
import { ReportGeneratorService } from '@/services/report-generator.service';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';

export class ReportsController {
    private reportService = new ReportGeneratorService();

    async exportInventory(req: Request, res: Response) {
        try {
            // @ts-ignore - organizationIds comes from authMiddleware
            const organizationId = req.user?.organizationIds[0];

            if (!organizationId) {
                return res.status(400).json({ error: 'No organization found' });
            }

            const buffer = await this.reportService.generateInventoryExcel(organizationId);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=inventario-${new Date().toISOString().split('T')[0]}.xlsx`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error exporting inventory:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async exportProduction(req: Request, res: Response) {
        try {
            const { event_id } = req.query;
            if (!event_id) {
                return res.status(400).json({ error: 'Event ID is required' });
            }

            const buffer = await this.reportService.generateProductionExcel(event_id as string);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=produccion_${event_id}.xlsx`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error exporting production:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async exportFoodCostPDF(req: Request, res: Response) {
        try {
            // @ts-ignore
            const organizationId = req.user?.organizationIds[0];
            const { start_date, end_date } = req.query;

            if (!start_date || !end_date) {
                return res.status(400).json({ error: 'start_date and end_date required' });
            }

            const buffer = await this.reportService.generateFoodCostPDF(
                organizationId,
                new Date(start_date as string),
                new Date(end_date as string)
            );

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=food-cost-${start_date}-${end_date}.pdf`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error exporting food cost PDF:', error);
            res.status(500).json({ error: 'Failed to export report' });
        }
    }

    async exportPurchaseOrdersExcel(req: Request, res: Response) {
        try {
            // @ts-ignore
            const organizationId = req.user?.organizationIds[0];
            const { start_date, end_date } = req.query;

            if (!start_date || !end_date) {
                return res.status(400).json({ error: 'start_date and end_date required' });
            }

            const buffer = await this.reportService.generatePurchaseOrdersExcel(
                organizationId,
                new Date(start_date as string),
                new Date(end_date as string)
            );

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=ordenes-compra-${start_date}-${end_date}.xlsx`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error exporting purchase orders Excel:', error);
            res.status(500).json({ error: 'Failed to export report' });
        }
    }
}
