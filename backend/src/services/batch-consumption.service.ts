import { supabase } from '@/config/supabase';

export class BatchConsumptionService {
    async consume(params: {
        organizationId: string;
        ingredientId: string;
        unitId: string;
        quantity: number;
        movementType: 'OUT' | 'WASTE' | 'ADJUSTMENT';
        userId?: string;
        productionOrderId?: string;
        notes?: string;
    }) {
        const {
            organizationId,
            ingredientId,
            unitId,
            quantity,
            movementType,
            userId,
            productionOrderId,
            notes,
        } = params;

        const { data, error } = await supabase.rpc('consume_inventory_fefo', {
            p_organization_id: organizationId,
            p_ingredient_id: ingredientId,
            p_unit_id: unitId,
            p_quantity: quantity,
            p_movement_type: movementType,
            p_user_id: userId || null,
            p_production_order_id: productionOrderId || null,
            p_notes: notes || null,
        });

        if (error) throw error;
        return data as string;
    }
}
