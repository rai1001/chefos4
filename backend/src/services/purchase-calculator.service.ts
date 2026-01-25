import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

interface IngredientNeed {
    ingredientId: string;
    quantity: number;
    unitId: string;
}

export class PurchaseCalculatorService {
    /**
     * Calcula la cantidad de compra necesaria para un ingrediente.
     * 
     * **Lógica del Algoritmo:**
     * 1. Recupera el ingrediente y su familia de productos.
     * 2. Determina el porcentaje de "Safety Buffer" (margen de seguridad).
     *    - Si la familia define uno (ej. 1.20 para 20%), se usa ese.
     *    - Si no, usa el default global 1.10 (10%).
     * 3. Multiplica la cantidad requerida por este buffer.
     * 4. Redondea hacia arriba (ceil) a 2 decimales para asegurar stock suficiente.
     * 
     * @param ingredientNeed Objeto con ID, cantidad requerida y unidad
     * @returns Cantidad final a pedir (incluyendo buffer)
     */
    async calculatePurchaseQuantity(
        ingredientNeed: IngredientNeed
    ): Promise<number> {
        try {
            // 1. Obtener ingrediente y su familia
            const { data: ingredient, error } = await supabase
                .from('ingredients')
                .select(`
          *,
          product_families (
            safety_buffer_pct
          )
        `)
                .eq('id', ingredientNeed.ingredientId)
                .single();

            if (error || !ingredient) {
                logger.error(error as any, 'Ingredient not found:');
                throw new Error('Ingredient not found');
            }

            // 2. Obtener buffer (default 1.10 si no tiene familia)
            const safetyBuffer =
                ingredient.product_families?.safety_buffer_pct || 1.10;

            // 3. Calcular cantidad con buffer
            const quantityWithBuffer = ingredientNeed.quantity * safetyBuffer;

            logger.info(`Applied buffer ${safetyBuffer} to ingredient ${ingredient.name}`);

            return Math.ceil(quantityWithBuffer * 100) / 100; // Redondear a 2 decimales
        } catch (error) {
            logger.error('Error calculating purchase quantity:', error);
            throw error;
        }
    }

    /**
     * Calcula cantidades para múltiples ingredientes en una sola consulta (Optimizado)
     * Reduce N queries a 1 query
     */
    async calculateBatchPurchaseQuantities(
        needs: IngredientNeed[]
    ): Promise<Map<string, number>> {
        if (needs.length === 0) return new Map();

        try {
            const ingredientIds = [...new Set(needs.map(n => n.ingredientId))];

            // 1. Bulk fetch ingredients + families
            const { data: ingredients, error } = await supabase
                .from('ingredients')
                .select(`
                    id,
                    name,
                    product_families (
                        safety_buffer_pct
                    )
                `)
                .in('id', ingredientIds);

            if (error) throw error;

            const results = new Map<string, number>();
            const ingredientsMap = new Map(ingredients?.map(i => [i.id, i]));

            // 2. Calculate in memory
            for (const need of needs) {
                const ingredient = ingredientsMap.get(need.ingredientId);
                if (!ingredient) {
                    logger.warn(`Ingredient ${need.ingredientId} not found during batch calculation`);
                    continue; // Skip or throw based on requirements
                }

                const family = Array.isArray(ingredient.product_families)
                    ? ingredient.product_families[0]
                    : ingredient.product_families;

                const safetyBuffer = family?.safety_buffer_pct || 1.10;
                const quantityWithBuffer = need.quantity * safetyBuffer;
                const finalQty = Math.ceil(quantityWithBuffer * 100) / 100;

                results.set(need.ingredientId, finalQty);
            }

            logger.info(`Batch calculated purchase quantities for ${needs.length} items`);
            return results;
        } catch (error) {
            logger.error('Error in batch purchase calculation:', error);
            throw error;
        }
    }

    /**
     * Genera orden de compra para un evento
     */
    async generatePurchaseOrderForEvent(eventId: string): Promise<any> {
        // TODO: Implementar lógica completa
        // 1. Obtener todas las recetas del evento
        // 2. Calcular ingredientes necesarios
        // 3. Aplicar safety buffer
        // 4. Agrupar por proveedor
        // 5. Crear borradores de PO

        throw new Error('Not implemented yet');
    }
}
