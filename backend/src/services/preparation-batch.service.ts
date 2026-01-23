import { supabase } from '@/config/supabase';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { BatchConsumptionService } from '@/services/batch-consumption.service';

interface IngredientUsageInput {
    ingredient_id: string;
    unit_id: string;
    quantity_used: number;
}

export class PreparationBatchService {
    private batchConsumption = new BatchConsumptionService();

    async createBatch(params: {
        organizationId: string;
        preparationId: string;
        producedAt: string;
        quantityProduced: number;
        expiryDate?: string | null;
        lotCode?: string | null;
        storageLocationId?: string | null;
        createdBy?: string | null;
        ingredients: IngredientUsageInput[];
    }) {
        if (params.quantityProduced <= 0) {
            throw new AppError(400, 'quantity_produced must be greater than 0');
        }

        const { data: preparation, error: prepError } = await supabase
            .from('preparations')
            .select('*')
            .eq('id', params.preparationId)
            .eq('organization_id', params.organizationId)
            .single();

        if (prepError || !preparation) {
            throw new AppError(404, 'Preparation not found');
        }

        const expiryDate =
            params.expiryDate ||
            this.calculateExpiryDate(params.producedAt, preparation.default_shelf_life_days || 0);

        const { data: batch, error } = await supabase
            .from('preparation_batches')
            .insert({
                organization_id: params.organizationId,
                preparation_id: params.preparationId,
                produced_at: params.producedAt,
                quantity_produced: params.quantityProduced,
                quantity_current: params.quantityProduced,
                expiry_date: expiryDate,
                lot_code: params.lotCode || `PREP-${Date.now()}`,
                storage_location_id: params.storageLocationId || null,
                created_by: params.createdBy || null,
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error creating preparation batch');
            throw new AppError(500, 'Failed to create preparation batch');
        }

        for (const ingredient of params.ingredients || []) {
            const movementId = await this.batchConsumption.consume({
                organizationId: params.organizationId,
                ingredientId: ingredient.ingredient_id,
                unitId: ingredient.unit_id,
                quantity: ingredient.quantity_used,
                movementType: 'OUT',
                userId: params.createdBy || undefined,
                notes: `Preparation batch ${batch.id}`,
            });

            const { error: ingredientError } = await supabase
                .from('preparation_batch_ingredients')
                .insert({
                    preparation_batch_id: batch.id,
                    ingredient_id: ingredient.ingredient_id,
                    unit_id: ingredient.unit_id,
                    quantity_used: ingredient.quantity_used,
                    movement_id: movementId,
                });

            if (ingredientError) {
                logger.error(ingredientError, 'Error linking preparation batch ingredients');
                throw new AppError(500, 'Failed to link preparation batch ingredients');
            }
        }

        const inventoryIngredientId = await this.ensurePreparationIngredient({
            organizationId: params.organizationId,
            preparationId: params.preparationId,
            preparationName: preparation.name,
            unitId: preparation.unit_id,
        });

        const { data: inventoryBatchId, error: inventoryError } = await supabase.rpc(
            'create_inventory_batch',
            {
                p_organization_id: params.organizationId,
                p_ingredient_id: inventoryIngredientId,
                p_unit_id: preparation.unit_id,
                p_quantity: params.quantityProduced,
                p_received_at: params.producedAt,
                p_expiry_date: expiryDate || null,
                p_lot_code: params.lotCode || batch.lot_code,
                p_delivery_note_item_id: null,
                p_storage_location_id: params.storageLocationId || null,
                p_user_id: params.createdBy || null,
                p_purchase_order_id: null,
                p_notes: `Preparation batch ${batch.id}`,
            }
        );

        if (inventoryError) {
            logger.error(inventoryError, 'Error creating inventory batch for preparation');
            throw new AppError(500, 'Failed to create inventory batch for preparation');
        }

        if (inventoryBatchId) {
            const { error: linkError } = await supabase
                .from('preparation_batches')
                .update({ inventory_batch_id: inventoryBatchId })
                .eq('id', batch.id);

            if (linkError) {
                logger.error(linkError, 'Error linking inventory batch to preparation batch');
            }
        }

        return batch;
    }

    async listBatches(params: {
        organizationIds: string[];
        expiringInDays?: number;
        locationId?: string;
    }) {
        let query = supabase
            .from('preparation_batches')
            .select(
                `
                *,
                preparation:preparations (id, name, unit_id, unit:units (abbreviation)),
                location:storage_locations (id, name)
            `
            )
            .in('organization_id', params.organizationIds)
            .order('produced_at', { ascending: false });

        if (params.expiringInDays !== undefined) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + params.expiringInDays);
            query = query.lte('expiry_date', targetDate.toISOString().slice(0, 10));
        }

        if (params.locationId) {
            query = query.eq('storage_location_id', params.locationId);
        }

        const { data, error } = await query;

        if (error) {
            logger.error(error, 'Error listing preparation batches');
            throw new AppError(500, 'Failed to fetch preparation batches');
        }

        return data || [];
    }

    async updateBatch(params: {
        id: string;
        organizationIds: string[];
        expiryDate?: string | null;
        storageLocationId?: string | null;
        quantityCurrent?: number;
        lotCode?: string | null;
    }) {
        const { data: existing, error: existingError } = await supabase
            .from('preparation_batches')
            .select('id')
            .eq('id', params.id)
            .in('organization_id', params.organizationIds)
            .single();

        if (existingError || !existing) {
            throw new AppError(404, 'Preparation batch not found');
        }

        const { data, error } = await supabase
            .from('preparation_batches')
            .update({
                expiry_date: params.expiryDate ?? undefined,
                storage_location_id: params.storageLocationId ?? undefined,
                quantity_current: params.quantityCurrent ?? undefined,
                lot_code: params.lotCode ?? undefined,
            })
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error updating preparation batch');
            throw new AppError(500, 'Failed to update preparation batch');
        }

        return data;
    }

    private calculateExpiryDate(producedAt: string, shelfLifeDays: number) {
        const produced = new Date(`${producedAt}T00:00:00Z`);
        produced.setUTCDate(produced.getUTCDate() + shelfLifeDays);
        return produced.toISOString().slice(0, 10);
    }

    private async ensurePreparationIngredient(params: {
        organizationId: string;
        preparationId: string;
        preparationName: string;
        unitId: string;
    }) {
        const { data: existing, error } = await supabase
            .from('ingredients')
            .select('id')
            .eq('organization_id', params.organizationId)
            .eq('preparation_id', params.preparationId)
            .maybeSingle();

        if (existing?.id) {
            return existing.id;
        }

        if (error) {
            logger.error(error, 'Error checking preparation ingredient');
            throw new AppError(500, 'Failed to check preparation ingredient');
        }

        const { data: created, error: createError } = await supabase
            .from('ingredients')
            .insert({
                organization_id: params.organizationId,
                name: params.preparationName,
                unit_id: params.unitId,
                cost_price: 0,
                stock_min: 0,
                stock_current: 0,
                is_preparation: true,
                preparation_id: params.preparationId,
            })
            .select('id')
            .single();

        if (createError || !created) {
            logger.error(createError, 'Error creating preparation ingredient');
            throw new AppError(500, 'Failed to create preparation ingredient');
        }

        return created.id;
    }
}
