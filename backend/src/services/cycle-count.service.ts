import { supabase } from '@/config/supabase';

export const calculateVariance = (expectedQty: number, countedQty: number) => countedQty - expectedQty;

export const formatAdjustmentNote = (cycleCountName: string, variance: number) => {
    const sign = variance >= 0 ? '+' : '';
    return `Cycle count "${cycleCountName}": ${sign}${variance}`;
};

export class CycleCountService {
    async listCounts(organizationIds: string[]) {
        const { data, error } = await supabase
            .from('cycle_counts')
            .select('*')
            .in('organization_id', organizationIds)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async getCount(params: { id: string; organizationIds: string[] }) {
        const { id, organizationIds } = params;
        const { data: count, error } = await supabase
            .from('cycle_counts')
            .select('*')
            .eq('id', id)
            .in('organization_id', organizationIds)
            .single();
        if (error) throw error;

        const { data: items, error: itemsError } = await supabase
            .from('cycle_count_items')
            .select(
                `
                *,
                ingredient:ingredients (id, name),
                batch:inventory_batches (id, expiry_date, lot_code),
                unit:units (id, name, abbreviation)
            `
            )
            .eq('cycle_count_id', id)
            .order('created_at', { ascending: true });
        if (itemsError) throw itemsError;

        return { ...count, items: items || [] };
    }

    async createCount(params: { organizationId: string; name: string; locationId?: string | null; userId?: string }) {
        const { organizationId, name, locationId, userId } = params;
        const { data: count, error } = await supabase
            .from('cycle_counts')
            .insert({
                organization_id: organizationId,
                name,
                location_id: locationId ?? null,
                status: 'IN_PROGRESS',
                created_by: userId ?? null,
            })
            .select()
            .single();
        if (error) throw error;

        let batchQuery = supabase
            .from('inventory_batches')
            .select('id, ingredient_id, quantity_current, unit_id')
            .eq('organization_id', organizationId);
        if (locationId) {
            batchQuery = batchQuery.eq('storage_location_id', locationId);
        }
        const { data: batches, error: batchesError } = await batchQuery;
        if (batchesError) throw batchesError;

        if (batches && batches.length > 0) {
            const items = batches.map((batch) => ({
                cycle_count_id: count.id,
                ingredient_id: batch.ingredient_id,
                batch_id: batch.id,
                expected_qty: batch.quantity_current,
                counted_qty: batch.quantity_current,
                unit_id: batch.unit_id,
                variance_qty: 0,
            }));
            const { error: itemsError } = await supabase.from('cycle_count_items').insert(items);
            if (itemsError) throw itemsError;
        }

        return count;
    }

    async updateItems(params: {
        countId: string;
        organizationIds: string[];
        items: { id: string; counted_qty: number; notes?: string | null }[];
    }) {
        const { countId, organizationIds, items } = params;
        const { data: count, error } = await supabase
            .from('cycle_counts')
            .select('*')
            .eq('id', countId)
            .in('organization_id', organizationIds)
            .single();
        if (error) throw error;

        for (const item of items) {
            const { data: existing, error: existingError } = await supabase
                .from('cycle_count_items')
                .select('expected_qty')
                .eq('id', item.id)
                .eq('cycle_count_id', countId)
                .single();
            if (existingError) throw existingError;

            const variance = calculateVariance(Number(existing.expected_qty), Number(item.counted_qty));
            const { error: updateError } = await supabase
                .from('cycle_count_items')
                .update({
                    counted_qty: item.counted_qty,
                    variance_qty: variance,
                    notes: item.notes ?? null,
                })
                .eq('id', item.id)
                .eq('cycle_count_id', countId);
            if (updateError) throw updateError;
        }

        if (count.status !== 'IN_PROGRESS') {
            const { error: statusError } = await supabase
                .from('cycle_counts')
                .update({ status: 'IN_PROGRESS' })
                .eq('id', countId)
                .in('organization_id', organizationIds);
            if (statusError) throw statusError;
        }

        return { updated: true };
    }

    async completeCount(params: { countId: string; organizationIds: string[]; userId?: string }) {
        const { countId, organizationIds, userId } = params;
        const { data: count, error } = await supabase
            .from('cycle_counts')
            .select('*')
            .eq('id', countId)
            .in('organization_id', organizationIds)
            .single();
        if (error) throw error;
        if (count.status === 'COMPLETED') {
            return { completed: true };
        }

        const { data: items, error: itemsError } = await supabase
            .from('cycle_count_items')
            .select('*')
            .eq('cycle_count_id', countId);
        if (itemsError) throw itemsError;

        for (const item of items || []) {
            const expected = Number(item.expected_qty);
            const counted = Number(item.counted_qty);
            const variance = calculateVariance(expected, counted);
            if (variance === 0) {
                continue;
            }

            const note = formatAdjustmentNote(count.name, variance);
            if (item.batch_id) {
                const { error: batchError } = await supabase
                    .from('inventory_batches')
                    .update({ quantity_current: counted })
                    .eq('id', item.batch_id);
                if (batchError) throw batchError;
            }

            if (variance > 0) {
                const { error: incError } = await supabase.rpc('increment_ingredient_stock', {
                    p_ingredient_id: item.ingredient_id,
                    p_quantity: variance,
                });
                if (incError) throw incError;
            } else {
                const { error: decError } = await supabase.rpc('decrement_ingredient_stock', {
                    p_ingredient_id: item.ingredient_id,
                    p_quantity: Math.abs(variance),
                });
                if (decError) throw decError;
            }

            const { data: movement, error: movementError } = await supabase
                .from('stock_movements')
                .insert({
                    organization_id: count.organization_id,
                    ingredient_id: item.ingredient_id,
                    movement_type: 'ADJUSTMENT',
                    quantity: Math.abs(variance),
                    unit_id: item.unit_id,
                    user_id: userId ?? null,
                    notes: note,
                })
                .select()
                .single();
            if (movementError) throw movementError;

            if (item.batch_id) {
                const { error: linkError } = await supabase.from('stock_movement_batches').insert({
                    movement_id: movement.id,
                    batch_id: item.batch_id,
                    quantity: Math.abs(variance),
                });
                if (linkError) throw linkError;
            }

            const { error: itemUpdateError } = await supabase
                .from('cycle_count_items')
                .update({ variance_qty: variance })
                .eq('id', item.id);
            if (itemUpdateError) throw itemUpdateError;
        }

        const { error: completeError } = await supabase
            .from('cycle_counts')
            .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
            .eq('id', countId)
            .in('organization_id', organizationIds);
        if (completeError) throw completeError;

        return { completed: true };
    }
}
