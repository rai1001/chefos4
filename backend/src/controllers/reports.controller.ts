import { Request, Response } from 'express';
import { ReportGeneratorService } from '@/services/report-generator.service';
import { logger } from '@/utils/logger';

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
            res.setHeader('Content-Disposition', 'attachment; filename=inventario.xlsx');
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

    async exportPurchaseOrdersPDF(req: Request, res: Response) {
        try {
            const { event_id } = req.query;
            // @ts-ignore - organizationIds comes from authMiddleware
            const organizationId = req.user?.organizationIds[0];

            if (!organizationId) {
                return res.status(400).json({ error: 'No organization found' });
            }

            const buffer = await this.reportService.generatePurchaseOrdersPDF(
                organizationId,
                event_id ? String(event_id) : undefined
            );

            const suffix = event_id ? `event-${event_id}` : 'all';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=ordenes-compra-${suffix}.pdf`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error exporting purchase orders PDF:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
