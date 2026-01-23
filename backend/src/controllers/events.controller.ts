import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';
import { DemandCalculatorService } from '@/services/demand-calculator.service';
import { PurchaseOrderGeneratorService } from '@/services/purchase-order-generator.service';

export class EventsController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orgIds = req.user!.organizationIds;
            const { start_date, end_date, event_type, status } = req.query;

            let query = supabase.from('events').select('*', { count: 'exact' }).in('organization_id', orgIds).is('deleted_at', null);
            if (start_date) query = query.gte('date_start', start_date);
            if (end_date) query = query.lte('date_start', end_date);
            if (event_type) query = query.eq('event_type', event_type);
            if (status) query = query.eq('status', status);

            const { data, error, count } = await query.order('date_start', { ascending: true });
            if (error) throw error;
            res.json({ data, total: count || 0 });
        } catch (error) {
            logger.error(error, 'Error fetching events');
            res.status(500).json({ error: 'Failed to fetch events' });
        }
    }

    async getById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;

            const { data: event, error: eventError } = await supabase.from('events').select('*').eq('id', id).in('organization_id', orgIds).is('deleted_at', null).single();
            if (eventError || !event) throw new AppError(404, 'Event not found');

            const { data: menus } = await supabase.from('event_menus').select('id, qty_forecast, recipe:recipes (id, name, cost_per_serving)').eq('event_id', id);
            const { data: directIngredients } = await supabase.from('event_direct_ingredients').select('id, quantity, ingredient:ingredients (id, name, cost_price), unit:units (id, name, abbreviation)').eq('event_id', id);

            res.json({ data: { ...event, menus: menus || [], direct_ingredients: directIngredients || [] } });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error fetching event');
            res.status(500).json({ error: 'Failed to fetch event' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, event_type, date_start, date_end, pax, menus, direct_ingredients } = req.body;
            const organizationId = req.user!.organizationIds[0];

            const { data: event, error: eventError } = await supabase.from('events').insert({ organization_id: organizationId, name, event_type, date_start, date_end: date_end || date_start, pax, status: 'DRAFT' }).select().single();
            if (eventError) throw eventError;

            if (menus && menus.length > 0) {
                const eventMenus = menus.map((menu: any) => ({ event_id: event.id, recipe_id: menu.recipe_id, qty_forecast: menu.qty_forecast || 0 }));
                await supabase.from('event_menus').insert(eventMenus);
            }

            if (direct_ingredients && direct_ingredients.length > 0) {
                const directIngs = direct_ingredients.map((ing: any) => ({ event_id: event.id, ingredient_id: ing.ingredient_id, quantity: ing.quantity, unit_id: ing.unit_id }));
                await supabase.from('event_direct_ingredients').insert(directIngs);
            }

            res.status(201).json({ data: event });
        } catch (error) {
            logger.error(error, 'Error creating event');
            res.status(500).json({ error: 'Failed to create event' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;
            const updateData = req.body;

            const { data: existing } = await supabase.from('events').select('id').eq('id', id).in('organization_id', orgIds).is('deleted_at', null).single();
            if (!existing) throw new AppError(404, 'Event not found');

            const { data, error } = await supabase.from('events').update(updateData).eq('id', id).select().single();
            if (error) throw error;
            res.json({ data });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error updating event');
            res.status(500).json({ error: 'Failed to update event' });
        }
    }

    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;
            await supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', id).in('organization_id', orgIds);
            res.json({ message: 'Event deleted successfully' });
        } catch (error) {
            logger.error(error, 'Error deleting event');
            res.status(500).json({ error: 'Failed to delete event' });
        }
    }

    async calculateDemand(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;

            const { data: event } = await supabase.from('events').select('id, name, event_type').eq('id', id).in('organization_id', orgIds).single();
            if (!event) throw new AppError(404, 'Event not found');

            const calculator = new DemandCalculatorService();
            const demands = await calculator.calculateEventDemand(id);
            res.json({ event: { id: event.id, name: event.name, type: event.event_type }, demands, total_items: demands.length });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error calculating demand');
            res.status(500).json({ error: 'Failed to calculate demand' });
        }
    }

    async generatePurchaseOrders(req: AuthRequest, res: Response): Promise<void> {
        // ... (existing code omitted for brevity but preserved)
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;
            const organizationId = orgIds[0];

            const { data: event } = await supabase.from('events').select('id, name').eq('id', id).in('organization_id', orgIds).single();
            if (!event) throw new AppError(404, 'Event not found');

            const generator = new PurchaseOrderGeneratorService();
            const stockCheck = await generator.checkStockAvailability(id);
            const generatedPOs = await generator.generateFromEvent(id, organizationId);

            res.json({
                event: { id: event.id, name: event.name },
                stock_status: stockCheck,
                generated_purchase_orders: generatedPOs,
                total_pos: generatedPOs.length,
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error generating purchase orders');
            res.status(500).json({ error: 'Failed to generate purchase orders' });
        }
    }

    async importCSV(req: AuthRequest, res: Response): Promise<void> {
        try {
            const file = (req as any).file;
            if (!file) throw new AppError(400, 'No file uploaded');
            const organizationId = req.user!.organizationIds[0];
            const { dryRun = 'true' } = req.body;

            const importer = new (await import('@/services/event-importer.service')).EventImporterService();

            if (dryRun === 'true') {
                const analysis = await importer.analyzeCSV(
                    file.buffer,
                    organizationId,
                    file.originalname
                );
                res.json({ data: analysis });
            } else {
                const result = await importer.executeImport(
                    file.buffer,
                    organizationId,
                    file.originalname
                );
                res.json({ data: result });
            }
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error importing events CSV');
            res.status(500).json({ error: 'Failed to import events CSV' });
        }
    }
}

