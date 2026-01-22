import { Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '@/middleware/auth.middleware';
import { InventoryService } from '@/services/inventory.service';
import { CycleCountService } from '@/services/cycle-count.service';
import { InventoryAlertsService } from '@/services/inventory-alerts.service';
import { InventoryAlertsJobService } from '@/services/inventory-alerts-job.service';
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
    private cycleCountService = new CycleCountService();
    private alertsService = new InventoryAlertsService();
    private alertsJob = new InventoryAlertsJobService();

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

    async listCycleCounts(req: AuthRequest, res: Response): Promise<void> {
        try {
            const counts = await this.cycleCountService.listCounts(req.user!.organizationIds);
            res.json({ data: counts });
        } catch (error) {
            logger.error('Error listing cycle counts:', error);
            res.status(500).json({ error: 'Failed to fetch cycle counts' });
        }
    }

    async getCycleCount(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const count = await this.cycleCountService.getCount({ id, organizationIds: req.user!.organizationIds });
            res.json({ data: count });
        } catch (error) {
            logger.error('Error fetching cycle count:', error);
            res.status(500).json({ error: 'Failed to fetch cycle count' });
        }
    }

    async createCycleCount(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, location_id } = req.body;
            if (!name) {
                res.status(400).json({ error: 'Name is required' });
                return;
            }
            const count = await this.cycleCountService.createCount({
                organizationId: req.user!.organizationIds[0],
                name,
                locationId: location_id ?? null,
                userId: req.user!.id,
            });
            res.status(201).json({ data: count });
        } catch (error) {
            logger.error('Error creating cycle count:', error);
            res.status(500).json({ error: 'Failed to create cycle count' });
        }
    }

    async updateCycleCountItems(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { items } = req.body;
            if (!Array.isArray(items)) {
                res.status(400).json({ error: 'Items are required' });
                return;
            }
            const result = await this.cycleCountService.updateItems({
                countId: id,
                organizationIds: req.user!.organizationIds,
                items,
            });
            res.json({ data: result });
        } catch (error) {
            logger.error('Error updating cycle count items:', error);
            res.status(500).json({ error: 'Failed to update cycle count items' });
        }
    }

    async completeCycleCount(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await this.cycleCountService.completeCount({
                countId: id,
                organizationIds: req.user!.organizationIds,
                userId: req.user!.id,
            });
            res.json({ data: result });
        } catch (error: any) {
            logger.error('Error completing cycle count:', error);
            res.status(500).json({ error: error.message || 'Failed to complete cycle count' });
        }
    }

    async listAlerts(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { status } = req.query;
            const alerts = await this.alertsService.listAlerts({
                organizationIds: req.user!.organizationIds,
                status: status as 'OPEN' | 'RESOLVED' | undefined,
            });
            res.json({ data: alerts });
        } catch (error) {
            logger.error('Error listing alerts:', error);
            res.status(500).json({ error: 'Failed to fetch alerts' });
        }
    }

    async resolveAlert(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const alert = await this.alertsService.resolveAlert({
                id,
                organizationIds: req.user!.organizationIds,
                userId: req.user!.id,
            });
            res.json({ data: alert });
        } catch (error) {
            logger.error('Error resolving alert:', error);
            res.status(500).json({ error: 'Failed to resolve alert' });
        }
    }

    async runAlerts(req: AuthRequest, res: Response): Promise<void> {
        try {
            const results = await this.alertsJob.runForOrganizations(req.user!.organizationIds);
            res.json({ data: results });
        } catch (error: any) {
            logger.error('Error running inventory alerts job:', error);
            res.status(500).json({ error: error.message || 'Failed to run inventory alerts job' });
        }
    }
}
