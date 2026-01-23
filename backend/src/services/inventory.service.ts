import { supabase } from '@/config/supabase';

export class InventoryService {
    async listBatches(params: {
        organizationIds: string[];
        ingredientId?: string;
        expiringInDays?: number;
        locationId?: string;
    }) {
        const { organizationIds, ingredientId, expiringInDays, locationId } = params;

        let query = supabase
            .from('inventory_batches')
            .select(
                `
          *,
          ingredient:ingredients (id, name, barcode),
          unit:units!inventory_batches_unit_id_fkey (id, name, abbreviation),
          location:storage_locations (id, name, type),
          delivery_note_item:delivery_note_items (id, description)
        `
            )
            .in('organization_id', organizationIds);

        if (ingredientId) {
            query = query.eq('ingredient_id', ingredientId);
        }
        if (locationId) {
            query = query.eq('storage_location_id', locationId);
        }
        if (expiringInDays !== undefined) {
            const end = new Date();
            end.setDate(end.getDate() + expiringInDays);
            query = query.lte('expiry_date', end.toISOString().split('T')[0]);
        }

        const { data, error } = await query.order('expiry_date', { ascending: true, nullsFirst: false });
        if (error) throw error;
        return data || [];
    }

    async updateBatch(params: {
        id: string;
        organizationIds: string[];
        expiryDate?: string | null;
        storageLocationId?: string | null;
        lotCode?: string | null;
    }) {
        const { id, organizationIds, expiryDate, storageLocationId, lotCode } = params;
        const { data, error } = await supabase
            .from('inventory_batches')
            .update({
                expiry_date: expiryDate,
                storage_location_id: storageLocationId,
                lot_code: lotCode,
            })
            .eq('id', id)
            .in('organization_id', organizationIds)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async listLocations(organizationIds: string[]) {
        const { data, error } = await supabase
            .from('storage_locations')
            .select('*')
            .in('organization_id', organizationIds)
            .order('name');
        if (error) throw error;
        return data || [];
    }

    async createLocation(organizationId: string, payload: { name: string; type?: string | null }) {
        const { data, error } = await supabase
            .from('storage_locations')
            .insert({ organization_id: organizationId, name: payload.name, type: payload.type || null })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateLocation(params: { id: string; organizationIds: string[]; name?: string; type?: string | null }) {
        const { id, organizationIds, name, type } = params;
        const { data, error } = await supabase
            .from('storage_locations')
            .update({ name, type: type ?? null })
            .eq('id', id)
            .in('organization_id', organizationIds)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteLocation(params: { id: string; organizationIds: string[] }) {
        const { id, organizationIds } = params;
        const { error } = await supabase
            .from('storage_locations')
            .delete()
            .eq('id', id)
            .in('organization_id', organizationIds);
        if (error) throw error;
        return { deleted: true };
    }

    async listStockSummary(organizationIds: string[]) {
        const { data: ingredients, error } = await supabase
            .from('ingredients')
            .select(`
          id,
          name,
          cost_price,
          stock_current,
          product_families (id, name),
          suppliers (id, name),
          units!ingredients_unit_id_fkey (id, name, abbreviation)
        `)
            .in('organization_id', organizationIds)
            .is('deleted_at', null)
            .gt('stock_current', 0)
            .order('name');

        if (error) throw error;

        const ingredientIds = (ingredients || []).map((row: any) => row.id);
        if (ingredientIds.length === 0) return [];

        const { data: batches, error: batchesError } = await supabase
            .from('inventory_batches')
            .select('ingredient_id, expiry_date, quantity_current')
            .in('organization_id', organizationIds)
            .in('ingredient_id', ingredientIds)
            .gt('quantity_current', 0);

        if (batchesError) throw batchesError;

        const nextExpiryByIngredient = new Map<string, string>();
        (batches || []).forEach((batch: any) => {
            if (!batch.expiry_date) return;
            const current = nextExpiryByIngredient.get(batch.ingredient_id);
            if (!current || batch.expiry_date < current) {
                nextExpiryByIngredient.set(batch.ingredient_id, batch.expiry_date);
            }
        });

        return (ingredients || []).map((row: any) => ({
            ...row,
            next_expiry_date: nextExpiryByIngredient.get(row.id) || null,
        }));
    }
}
