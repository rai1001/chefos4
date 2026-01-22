import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { DemandCalculatorService } from './demand-calculator.service';
import { DeliveryEstimatorService } from './delivery-estimator.service';


interface GeneratedPO {
    supplier_id: string;
    supplier_name: string;
    items: {
        ingredient_id: string;
        ingredient_name: string;
        quantity_ordered: number;
        unit_id: string;
        unit_abbr: string;
        unit_price: number;
    }[];
    estimated_delivery: string;
    total_cost: number;
}


export class PurchaseOrderGeneratorService {
    /**
     * Genera órdenes de compra automáticamente desde un evento
     * 
     * PROCESO:
     * 1. Calcular demanda del evento (con Safety Buffer)
     * 2. Agrupar ingredientes por proveedor
     * 3. Crear PO por proveedor con fecha estimada
     */
    async generateFromEvent(
        eventId: string,
        organizationId: string
    ): Promise<GeneratedPO[]> {
        try {
            logger.info(`Generating purchase orders for event ${eventId}`);


            // 1. Calcular demanda
            const demandCalculator = new DemandCalculatorService();
            const demands = await demandCalculator.calculateEventDemand(eventId);


            if (demands.length === 0) {
                logger.warn('No ingredients needed for event');
                return [];
            }


            // 2. Agrupar por proveedor
            const bySupplier = await this.groupBySupplier(demands);


            // 3. Crear POs con fecha estimada
            const deliveryEstimator = new DeliveryEstimatorService();
            const generatedPOs: GeneratedPO[] = [];


            for (const [supplierId, items] of bySupplier) {
                const { data: supplier } = await supabase
                    .from('suppliers')
                    .select('name')
                    .eq('id', supplierId)
                    .single();


                if (!supplier) continue;


                // Estimar entrega
                const deliveryDate = await deliveryEstimator.estimateDeliveryDate(supplierId);


                // Calcular total
                const totalCost = items.reduce(
                    (sum, item) => sum + item.quantity_ordered * item.unit_price,
                    0
                );


                // Crear PO en BD
                const { data: po, error: poError } = await supabase
                    .from('purchase_orders')
                    .insert({
                        organization_id: organizationId,
                        supplier_id: supplierId,
                        event_id: eventId,
                        status: 'DRAFT',
                        order_date: new Date().toISOString(),
                        delivery_date_estimated: deliveryDate.toISOString(),
                        total_cost: totalCost,
                    })
                    .select()
                    .single();


                if (poError) {
                    logger.error(`Error creating PO for supplier ${supplierId}:`, poError);
                    continue;
                }


                // Insertar items
                const poItems = items.map((item) => ({
                    purchase_order_id: po.id,
                    ingredient_id: item.ingredient_id,
                    quantity_ordered: item.quantity_ordered,
                    unit_id: item.unit_id,
                    unit_price: item.unit_price,
                }));


                const { error: itemsError } = await supabase
                    .from('purchase_order_items')
                    .insert(poItems);


                if (itemsError) {
                    logger.error(`Error inserting items for PO ${po.id}:`, itemsError);
                    // Rollback
                    await supabase.from('purchase_orders').delete().eq('id', po.id);
                    continue;
                }


                generatedPOs.push({
                    supplier_id: supplierId,
                    supplier_name: supplier.name,
                    items,
                    estimated_delivery: deliveryDate.toISOString(),
                    total_cost: totalCost,
                });


                logger.info(`Created PO ${po.id} for supplier ${supplier.name}`);
            }


            return generatedPOs;
        } catch (error) {
            logger.error('Error generating purchase orders:', error);
            throw error;
        }
    }


    /**
     * Agrupa demandas por proveedor
     */
    private async groupBySupplier(
        demands: any[]
    ): Promise<Map<string, any[]>> {
        const bySupplier = new Map();


        for (const demand of demands) {
            // Obtener proveedor del ingrediente
            const { data: ingredient } = await supabase
                .from('ingredients')
                .select('supplier_id, cost_price')
                .eq('id', demand.ingredient_id)
                .single();


            if (!ingredient || !ingredient.supplier_id) {
                logger.warn(`Ingredient ${demand.ingredient_id} has no supplier`);
                continue;
            }


            const supplierId = ingredient.supplier_id;


            if (!bySupplier.has(supplierId)) {
                bySupplier.set(supplierId, []);
            }


            bySupplier.get(supplierId)!.push({
                ingredient_id: demand.ingredient_id,
                ingredient_name: demand.ingredient_name,
                quantity_ordered: demand.quantity_with_buffer, // CON safety buffer
                unit_id: demand.unit_id,
                unit_abbr: demand.unit_abbr,
                unit_price: ingredient.cost_price,
            });
        }


        return bySupplier;
    }


    /**
     * Verifica disponibilidad de stock antes de crear PO
     */
    async checkStockAvailability(eventId: string): Promise<{
        has_sufficient_stock: boolean;
        missing_ingredients: any[];
    }> {
        const demandCalculator = new DemandCalculatorService();
        const demands = await demandCalculator.calculateEventDemand(eventId);


        const missing: any[] = [];


        for (const demand of demands) {
            const { data: ingredient } = await supabase
                .from('ingredients')
                .select('stock_current')
                .eq('id', demand.ingredient_id)
                .single();


            if (!ingredient) continue;


            if (ingredient.stock_current < demand.quantity_with_buffer) {
                missing.push({
                    ingredient_id: demand.ingredient_id,
                    ingredient_name: demand.ingredient_name,
                    needed: demand.quantity_with_buffer,
                    current: ingredient.stock_current,
                    shortage: demand.quantity_with_buffer - ingredient.stock_current,
                });
            }
        }


        return {
            has_sufficient_stock: missing.length === 0,
            missing_ingredients: missing,
        };
    }
}
