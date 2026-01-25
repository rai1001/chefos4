import { Request, Response } from 'express';
import { WasteManagementService } from '@/services/waste-management.service';
import { z } from 'zod';

const wasteService = new WasteManagementService();

// Schema de validación
const recordWasteSchema = z.object({
    ingredientId: z.string().uuid(),
    quantity: z.number().positive(),
    unitId: z.string().uuid(),
    wasteCauseId: z.string().uuid(),
    notes: z.string().optional(),
});

export class WasteController {

    async recordWaste(req: Request, res: Response) {
        try {
            const organizationId = (req as any).user?.organizationIds[0]; // Asume single org context for now
            if (!organizationId) return res.status(400).json({ error: 'Organization context required' });

            const validatedData = recordWasteSchema.parse(req.body);

            await wasteService.recordWaste({
                ...validatedData,
                organizationId,
                userId: (req as any).user?.id
            });

            res.status(201).json({ message: 'Waste recorded successfully' });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Failed to record waste' });
        }
    }

    async getAnalysis(req: Request, res: Response) {
        try {
            const organizationId = (req as any).user?.organizationIds[0];
            if (!organizationId) return res.status(400).json({ error: 'Organization context required' });

            const { start, end } = req.query;
            const startDate = start ? new Date(String(start)) : new Date(new Date().setDate(new Date().getDate() - 30));
            const endDate = end ? new Date(String(end)) : new Date();

            const analysis = await wasteService.getWasteAnalysis(organizationId, startDate, endDate);
            const topIngredients = await wasteService.getTopWastedIngredients(organizationId, startDate, endDate);
            const preventablePct = await wasteService.getPreventableWastePercentage(organizationId, startDate, endDate);

            res.json({
                analysis,
                topIngredients,
                kpis: {
                    preventablePercentage: preventablePct
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve waste analysis' });
        }
    }
}
