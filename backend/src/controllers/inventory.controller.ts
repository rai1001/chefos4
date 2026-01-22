import { Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '@/middleware/auth.middleware';
import { InventoryService } from '@/services/inventory.service';
import { ExpiryOCRService } from '@/services/expiry-ocr.service';
import { BatchConsumptionService } from '@/services/batch-consumption.service';
import { BarcodeResolverService } from '@/services/barcode-resolver.service';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const uploadImageMiddleware = upload.single('file');

export class InventoryController {
    private inventoryService = new InventoryService();
    private barcodeResolver = new BarcodeResolverService();
    private batchConsumption = new BatchConsumptionService();

    async listBatches(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { ingredient_id, expiring_in_days, location_id } = req.query;
            const batches = await this.inventoryService.listBatches({
                organizationIds: req.user!.organizationIds,
                ingredientId: ingredient_id as string | undefined,
                expiringInDays: expiring_in_days ? Number(expiring_in_days) : undefined,
                locationId: location_id as string | undefined,
            });
            res.json({ data: batches });
        } catch (error) {
            logger.error('Error listing batches:', error);
            res.status(500).json({ error: 'Failed to fetch batches' });
        }
    }

    async updateBatch(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { expiry_date, storage_location_id, lot_code } = req.body;
            const batch = await this.inventoryService.updateBatch({
                id,
                organizationIds: req.user!.organizationIds,
                expiryDate: expiry_date ?? null,
                storageLocationId: storage_location_id ?? null,
                lotCode: lot_code ?? null,
            });
            res.json({ data: batch });
        } catch (error) {
            logger.error('Error updating batch:', error);
            res.status(500).json({ error: 'Failed to update batch' });
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
            logger.error('Error scanning expiry:', error);
            res.status(500).json({ error: 'Failed to scan expiry' });
        }
    }

    async stockOut(req: AuthRequest, res: Response): Promise<void> {
        try {
            const {
                barcode,
                ingredient_id,
                quantity,
                movement_type = 'OUT',
                notes,
                production_order_id,
                save_barcode,
            } = req.body;

            if (!quantity || Number(quantity) <= 0) {
                res.status(400).json({ error: 'Quantity must be greater than 0' });
                return;
            }

            const organizationId = req.user!.organizationIds[0];
            const ingredient = await this.barcodeResolver.resolve({
                organizationId,
                barcode,
                ingredientId: ingredient_id,
                saveBarcode: Boolean(save_barcode),
            });

            if (!ingredient) {
                res.status(404).json({ error: 'Ingredient not found for barcode' });
                return;
            }

            const movementId = await this.batchConsumption.consume({
                organizationId,
                ingredientId: ingredient.id,
                unitId: ingredient.unit_id,
                quantity: Number(quantity),
                movementType: movement_type,
                userId: req.user!.id,
                productionOrderId: production_order_id || undefined,
                notes,
            });

            const { data: movementBatches } = await supabase
                .from('stock_movement_batches')
                .select('batch_id, quantity, batch:inventory_batches (expiry_date, lot_code)')
                .eq('movement_id', movementId);

            res.json({ data: { movement_id: movementId, batches: movementBatches || [] } });
        } catch (error: any) {
            logger.error('Error stock-out:', error);
            res.status(500).json({ error: error.message || 'Failed to process stock out' });
        }
    }

    async listLocations(req: AuthRequest, res: Response): Promise<void> {
        try {
            const locations = await this.inventoryService.listLocations(req.user!.organizationIds);
            res.json({ data: locations });
        } catch (error) {
            logger.error('Error listing locations:', error);
            res.status(500).json({ error: 'Failed to fetch locations' });
        }
    }

    async createLocation(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, type } = req.body;
            if (!name) {
                res.status(400).json({ error: 'Name is required' });
                return;
            }
            const location = await this.inventoryService.createLocation(req.user!.organizationIds[0], { name, type });
            res.status(201).json({ data: location });
        } catch (error) {
            logger.error('Error creating location:', error);
            res.status(500).json({ error: 'Failed to create location' });
        }
    }

    async updateLocation(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, type } = req.body;
            const location = await this.inventoryService.updateLocation({
                id,
                organizationIds: req.user!.organizationIds,
                name,
                type,
            });
            res.json({ data: location });
        } catch (error) {
            logger.error('Error updating location:', error);
            res.status(500).json({ error: 'Failed to update location' });
        }
    }

    async deleteLocation(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await this.inventoryService.deleteLocation({
                id,
                organizationIds: req.user!.organizationIds,
            });
            res.json({ data: result });
        } catch (error) {
            logger.error('Error deleting location:', error);
            res.status(500).json({ error: 'Failed to delete location' });
        }
    }
}
