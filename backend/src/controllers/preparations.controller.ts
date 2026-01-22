import { Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '@/middleware/auth.middleware';
import { PreparationService } from '@/services/preparation.service';
import { PreparationBatchService } from '@/services/preparation-batch.service';
import { PreparationLabelService } from '@/services/preparation-label.service';
import { ExpiryOCRService } from '@/services/expiry-ocr.service';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const uploadImageMiddleware = upload.single('file');

export class PreparationsController {
    private preparationService = new PreparationService();
    private batchService = new PreparationBatchService();
    private labelService = new PreparationLabelService();

    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const data = await this.preparationService.list(req.user!.organizationIds);
            res.json({ data });
        } catch (error) {
            logger.error(error, 'Error listing preparations');
            res.status(500).json({ error: 'Failed to fetch preparations' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, unit_id, default_shelf_life_days, station, notes, active } = req.body;
            if (!name || !unit_id) {
                throw new AppError(400, 'name and unit_id are required');
            }

            const data = await this.preparationService.create({
                organizationId: req.user!.organizationIds[0],
                name,
                unitId: unit_id,
                defaultShelfLifeDays: default_shelf_life_days,
                station,
                notes,
                active,
            });

            res.status(201).json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error creating preparation');
            res.status(500).json({ error: 'Failed to create preparation' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, unit_id, default_shelf_life_days, station, notes, active } = req.body;

            const data = await this.preparationService.update({
                id,
                organizationIds: req.user!.organizationIds,
                name,
                unitId: unit_id,
                defaultShelfLifeDays: default_shelf_life_days,
                station,
                notes,
                active,
            });

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error updating preparation');
            res.status(500).json({ error: 'Failed to update preparation' });
        }
    }

    async createBatch(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const {
                produced_at,
                quantity_produced,
                expiry_date,
                lot_code,
                storage_location_id,
                ingredients,
            } = req.body;

            if (!produced_at || !quantity_produced) {
                throw new AppError(400, 'produced_at and quantity_produced are required');
            }

            const data = await this.batchService.createBatch({
                organizationId: req.user!.organizationIds[0],
                preparationId: id,
                producedAt: produced_at,
                quantityProduced: Number(quantity_produced),
                expiryDate: expiry_date || null,
                lotCode: lot_code || null,
                storageLocationId: storage_location_id || null,
                createdBy: req.user!.id,
                ingredients: ingredients || [],
            });

            res.status(201).json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error creating preparation batch');
            res.status(500).json({ error: 'Failed to create preparation batch' });
        }
    }

    async listBatches(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { expiring_in_days, location_id } = req.query;
            const data = await this.batchService.listBatches({
                organizationIds: req.user!.organizationIds,
                expiringInDays: expiring_in_days ? Number(expiring_in_days) : undefined,
                locationId: location_id as string | undefined,
            });
            res.json({ data });
        } catch (error) {
            logger.error(error, 'Error listing preparation batches');
            res.status(500).json({ error: 'Failed to fetch preparation batches' });
        }
    }

    async updateBatch(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { expiry_date, storage_location_id, quantity_current, lot_code } = req.body;

            const data = await this.batchService.updateBatch({
                id,
                organizationIds: req.user!.organizationIds,
                expiryDate: expiry_date ?? null,
                storageLocationId: storage_location_id ?? null,
                quantityCurrent: quantity_current !== undefined ? Number(quantity_current) : undefined,
                lotCode: lot_code ?? null,
            });

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error updating preparation batch');
            res.status(500).json({ error: 'Failed to update preparation batch' });
        }
    }

    async printLabels(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const labelCount = Number(req.body?.label_count || 1);

            const { data: batch, error } = await this.fetchBatch(id, req.user!.organizationIds);
            if (error || !batch) {
                throw new AppError(404, 'Preparation batch not found');
            }

            const pdf = await this.labelService.generateLabels({
                batchId: batch.id,
                preparationName: batch.preparation?.name || 'Preparacion',
                lotCode: batch.lot_code || batch.id.slice(0, 8),
                expiryDate: batch.expiry_date,
                producedAt: batch.produced_at,
                labelCount: labelCount > 0 ? labelCount : 1,
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=prep-labels-${batch.id}.pdf`);
            res.send(pdf);
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error printing labels');
            res.status(500).json({ error: 'Failed to generate labels' });
        }
    }

    async scanExpiry(req: AuthRequest, res: Response): Promise<void> {
        try {
            const file = (req as any).file;
            if (!file) {
                res.status(400).json({ error: 'Image file is required' });
                return;
            }

            const candidates = await ExpiryOCRService.scanImage(file.buffer);
            res.json({ data: { candidates } });
        } catch (error) {
            logger.error(error, 'Error scanning expiry');
            res.status(500).json({ error: 'Failed to scan expiry' });
        }
    }

    private async fetchBatch(id: string, organizationIds: string[]) {
        return supabase
            .from('preparation_batches')
            .select('*, preparation:preparations (name)')
            .eq('id', id)
            .in('organization_id', organizationIds)
            .single();
    }
}
