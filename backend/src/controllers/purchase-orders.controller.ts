import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';
import { DeliveryEstimatorService } from '@/services/delivery-estimator.service';


export class PurchaseOrdersController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orgIds = req.user!.organizationIds;
            const { status, supplier_id, event_id, page = 1, limit = 20 } = req.query;


            let query = supabase
                .from('purchase_orders')
                .select(`
          *,
          supplier:suppliers (
            id,
            name
          ),
          event:events (
            id,
            name,
            date_start
          )
        `, { count: 'exact' })
                .in('organization_id', orgIds)
                .is('deleted_at', null);


            // Filtros
            if (status) {
                query = query.eq('status', status);
            }
            if (supplier_id) {
                query = query.eq('supplier_id', supplier_id);
            }
            if (event_id) {
                query = query.eq('event_id', event_id);
            }


            // Paginación
            const offset = (Number(page) - 1) * Number(limit);
            query = query
                .range(offset, offset + Number(limit) - 1)
                .order('order_date', { ascending: false });


            const { data, error, count } = await query;


            if (error) throw error;


            res.json({
                data,
                pagination: {
                    total: count || 0,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil((count || 0) / Number(limit)),
                },
            });
        } catch (error) {
            logger.error('Error fetching purchase orders:', error);
            res.status(500).json({ error: 'Failed to fetch purchase orders' });
        }
    }


    async getById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;


            // PO base
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .select(`
          *,
          supplier:suppliers (
            id,
            name,
            contact_email,
            contact_phone
          ),
          event:events (
            id,
            name,
            date_start
          )
        `)
                .eq('id', id)
                .in('organization_id', orgIds)
                .is('deleted_at', null)
                .single();


            if (poError || !po) {
                throw new AppError(404, 'Purchase order not found');
            }


            // Items de la PO
            const { data: items, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select(`
          *,
          ingredient:ingredients (
            id,
            name,
            cost_price
          ),
          unit:units (
            id,
            name,
            abbreviation
          )
        `)
                .eq('purchase_order_id', id);


            if (itemsError) throw itemsError;


            res.json({
                data: {
                    ...po,
                    items: items || [],
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Error fetching purchase order:', error);
            res.status(500).json({ error: 'Failed to fetch purchase order' });
        }
    }


    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { supplier_id, event_id, items } = req.body;
            const organizationId = req.user!.organizationIds[0];


            // 1. Estimar fecha de entrega
            const estimator = new DeliveryEstimatorService();
            const deliveryDate = await estimator.estimateDeliveryDate(supplier_id);


            // 2. Crear PO
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .insert({
                    organization_id: organizationId,
                    supplier_id,
                    event_id,
                    status: 'DRAFT',
                    order_date: new Date().toISOString(),
                    delivery_date_estimated: deliveryDate.toISOString(),
                })
                .select()
                .single();


            if (poError) throw poError;


            // 3. Añadir items
            if (items && items.length > 0) {
                const poItems = items.map((item: any) => ({
                    purchase_order_id: po.id,
                    ingredient_id: item.ingredient_id,
                    quantity_ordered: item.quantity_ordered,
                    unit_id: item.unit_id,
                    unit_price: item.unit_price || 0,
                }));


                const { error: itemsError } = await supabase
                    .from('purchase_order_items')
                    .insert(poItems);


                if (itemsError) {
                    // Rollback
                    await supabase.from('purchase_orders').delete().eq('id', po.id);
                    throw itemsError;
                }
            }


            // 4. Calcular total
            await this.recalculateTotal(po.id);


            res.status(201).json({ data: po });
        } catch (error) {
            logger.error('Error creating purchase order:', error);
            res.status(500).json({ error: 'Failed to create purchase order' });
        }
    }


    async updateStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const orgIds = req.user!.organizationIds;


            // Verificar ownership
            const { data: existing } = await supabase
                .from('purchase_orders')
                .select('id')
                .eq('id', id)
                .in('organization_id', orgIds)
                .single();


            if (!existing) {
                throw new AppError(404, 'Purchase order not found');
            }


            const { data, error } = await supabase
                .from('purchase_orders')
                .update({ status })
                .eq('id', id)
                .select()
                .single();


            if (error) throw error;


            res.json({ data });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Error updating PO status:', error);
            res.status(500).json({ error: 'Failed to update status' });
        }
    }


    async receiveItems(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { items, delivery_date_actual } = req.body;
            const orgIds = req.user!.organizationIds;


            // Verificar ownership
            const { data: po } = await supabase
                .from('purchase_orders')
                .select('id, status')
                .eq('id', id)
                .in('organization_id', orgIds)
                .single();


            if (!po) {
                throw new AppError(404, 'Purchase order not found');
            }


            if (po.status !== 'SENT') {
                throw new AppError(400, 'Can only receive items from SENT orders');
            }


            // 1. Actualizar cantidades recibidas
            for (const item of items) {
                const { error } = await supabase
                    .from('purchase_order_items')
                    .update({ quantity_received: item.quantity_received })
                    .eq('id', item.id);


                if (error) throw error;


                // 2. Actualizar stock de ingrediente
                const { data: poItem } = await supabase
                    .from('purchase_order_items')
                    .select('ingredient_id')
                    .eq('id', item.id)
                    .single();


                if (poItem) {
                    await supabase.rpc('increment_ingredient_stock', {
                        p_ingredient_id: poItem.ingredient_id,
                        p_quantity: item.quantity_received,
                    });
                }
            }


            // 3. Actualizar estado de PO
            const allReceived = items.every(
                (item: any) => item.quantity_received >= item.quantity_ordered
            );


            const { data: updatedPO, error: updateError } = await supabase
                .from('purchase_orders')
                .update({
                    status: allReceived ? 'RECEIVED' : 'PARTIAL',
                    delivery_date_actual: delivery_date_actual || new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();


            if (updateError) throw updateError;


            res.json({ data: updatedPO });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Error receiving items:', error);
            res.status(500).json({ error: 'Failed to receive items' });
        }
    }


    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;


            // Solo permitir eliminar DRAFT
            const { data: po } = await supabase
                .from('purchase_orders')
                .select('status')
                .eq('id', id)
                .in('organization_id', orgIds)
                .single();


            if (!po) {
                throw new AppError(404, 'Purchase order not found');
            }


            if (po.status !== 'DRAFT') {
                throw new AppError(400, 'Can only delete DRAFT orders');
            }


            const { error } = await supabase
                .from('purchase_orders')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);


            if (error) throw error;


            res.json({ message: 'Purchase order deleted successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Error deleting purchase order:', error);
            res.status(500).json({ error: 'Failed to delete purchase order' });
        }
    }


    // ========================================
    // HELPERS
    // ========================================


    private async recalculateTotal(poId: string): Promise<void> {
        const { data: items } = await supabase
            .from('purchase_order_items')
            .select('total_price')
            .eq('purchase_order_id', poId);


        const total = items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;


        await supabase
            .from('purchase_orders')
            .update({ total_cost: total })
            .eq('id', poId);
    }
}
