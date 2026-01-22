import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

interface IngredientNeed {
    ingredientId: string;
    quantity: number;
    unitId: string;
}

export class PurchaseCalculatorService {
    /**
     * Calcula la cantidad a pedir aplicando Safety Buffer
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
                logger.error('Ingredient not found:', error);
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
