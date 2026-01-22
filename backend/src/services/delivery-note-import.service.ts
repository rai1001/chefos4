import { supabase } from '@/config/supabase';

export interface DeliveryNoteItemUpdate {
    id: string;
    ingredient_id?: string | null;
    unit_id?: string | null;
    status?: 'PENDING' | 'LINKED' | 'IGNORED';
    quantity?: number;
    unit_price?: number;
    lot_code?: string | null;
    expiry_date?: string | null;
    storage_location_id?: string | null;
}

export class DeliveryNoteImportService {
    async ensureItems(deliveryNoteId: string, organizationId: string) {
        const { data: existing, error: existingError } = await supabase
            .from('delivery_note_items')
            .select('id')
            .eq('delivery_note_id', deliveryNoteId)
            .eq('organization_id', organizationId);

        if (existingError) throw existingError;
        if (existing && existing.length > 0) return;

        const { data: note, error: noteError } = await supabase
            .from('delivery_notes')
            .select('extracted_data')
            .eq('id', deliveryNoteId)
            .eq('organization_id', organizationId)
            .single();

        if (noteError) throw noteError;

        const extracted = (note as any)?.extracted_data?.items || [];
        if (!Array.isArray(extracted) || extracted.length === 0) return;

        const rows = extracted.map((item: any) => ({
            organization_id: organizationId,
            delivery_note_id: deliveryNoteId,
            description: item.description || 'Item',
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
            status: 'PENDING',
        }));

        const { error: insertError } = await supabase
            .from('delivery_note_items')
            .insert(rows);

        if (insertError) throw insertError;
    }

    async updateItems(updates: DeliveryNoteItemUpdate[], organizationIds: string[]) {
        for (const update of updates) {
            const { id, ...payload } = update;
            const { error } = await supabase
                .from('delivery_note_items')
                .update(payload)
                .eq('id', id)
                .in('organization_id', organizationIds);
            if (error) throw error;
        }
    }

    async importToInventory(params: {
        deliveryNoteId: string;
        organizationId: string;
        userId?: string;
    }) {
        const { deliveryNoteId, organizationId, userId } = params;

        const { data: note, error: noteError } = await supabase
            .from('delivery_notes')
            .select('id, purchase_order_id')
            .eq('id', deliveryNoteId)
            .eq('organization_id', organizationId)
            .single();

        if (noteError) throw noteError;

        const { data: items, error: itemsError } = await supabase
            .from('delivery_note_items')
            .select('*')
            .eq('delivery_note_id', deliveryNoteId)
            .eq('organization_id', organizationId);

        if (itemsError) throw itemsError;

        const unresolved = (items || []).filter(
            (item: any) => item.status !== 'IGNORED' && !item.ingredient_id
        );
        if (unresolved.length > 0) {
            return { created_batches: [], unmatched_items: unresolved };
        }

        const ingredientIds = (items || [])
            .filter((item: any) => item.status !== 'IGNORED')
            .map((item: any) => item.ingredient_id);

        const { data: ingredients, error: ingError } = await supabase
            .from('ingredients')
            .select('id, unit_id')
            .eq('organization_id', organizationId)
            .in('id', ingredientIds);

        if (ingError) throw ingError;

        const ingredientMap = new Map((ingredients || []).map((i: any) => [i.id, i]));
        const createdBatches: any[] = [];

        for (const item of items || []) {
            if (item.status === 'IGNORED') continue;
            const ingredient = ingredientMap.get(item.ingredient_id);
            if (!ingredient) continue;

            const { data: batchId, error: batchError } = await supabase.rpc('create_inventory_batch', {
                p_organization_id: organizationId,
                p_ingredient_id: item.ingredient_id,
                p_unit_id: item.unit_id || ingredient.unit_id,
                p_quantity: item.quantity,
                p_received_at: new Date().toISOString(),
                p_expiry_date: item.expiry_date || null,
                p_lot_code: item.lot_code || null,
                p_delivery_note_item_id: item.id,
                p_storage_location_id: item.storage_location_id || null,
                p_user_id: userId || null,
                p_purchase_order_id: note.purchase_order_id || null,
                p_notes: 'Import from delivery note',
            });

            if (batchError) throw batchError;
            createdBatches.push(batchId);

            if (note.purchase_order_id) {
                const { data: poItem } = await supabase
                    .from('purchase_order_items')
                    .select('id, quantity_received')
                    .eq('purchase_order_id', note.purchase_order_id)
                    .eq('ingredient_id', item.ingredient_id)
                    .maybeSingle();

                if (poItem) {
                    await supabase
                        .from('purchase_order_items')
                        .update({
                            quantity_received: Number(poItem.quantity_received || 0) + Number(item.quantity || 0),
                        })
                        .eq('id', poItem.id);
                }
            }
        }

        await supabase
            .from('delivery_notes')
            .update({
                status: 'RECONCILED',
                reconciled_at: new Date().toISOString(),
                imported_at: new Date().toISOString(),
                imported_by: userId || null,
            })
            .eq('id', deliveryNoteId)
            .eq('organization_id', organizationId);

        return { created_batches: createdBatches, unmatched_items: [] };
    }
}
