import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';

export class WasteController {

    // Get all waste causes (system + org specific)
    async getCauses(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orgIds = req.user!.organizationIds;

            // RLS policy handles filtering (org specific OR system default)
            // But we need to ensure we query correctly if RLS depends on auth.uid() or similar.
            // Our policy: organization_id IN (user_orgs) OR (org_id is null AND is_system=true)

            const { data, error } = await supabase
                .from('waste_causes')
                .select('*')
                .or(`organization_id.in.(${orgIds.join(',')}),and(organization_id.is.null,is_system.eq.true)`)
                .order('name');

            if (error) throw error;

            res.json({ data });
        } catch (error) {
            logger.error({ error }, 'Error fetching waste causes');
            res.status(500).json({ error: 'Failed to fetch waste causes' });
        }
    }

    // Create a new custom cause
    async createCause(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, description } = req.body;
            const organizationId = req.user!.organizationIds[0];

            if (!name) throw new AppError(400, 'Name is required');

            const { data, error } = await supabase
                .from('waste_causes')
                .insert({
                    organization_id: organizationId,
                    name,
                    description,
                    is_system: false
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({ data });
        } catch (error) {
            logger.error({ error }, 'Error creating waste cause');
            res.status(500).json({ error: 'Failed to create waste cause' });
        }
    }

    // Log a waste event
    async createWasteEntry(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { ingredient_id, quantity, waste_cause_id, notes } = req.body;
            const organizationId = req.user!.organizationIds[0];

            if (!ingredient_id || !quantity || !waste_cause_id) {
                throw new AppError(400, 'Missing required fields');
            }

            // 1. Get Ingredient for current cost
            const { data: ingredient, error: ingError } = await supabase
                .from('ingredients')
                .select('cost_price, stock_current')
                .eq('id', ingredient_id)
                .single();

            if (ingError || !ingredient) throw new AppError(404, 'Ingredient not found');

            const costAmount = Number(ingredient.cost_price) * Number(quantity);

            // 2. Insert Inventory Log (Transaction)
            const { error: logError } = await supabase
                .from('inventory_logs')
                .insert({
                    organization_id: organizationId,
                    ingredient_id,
                    quantity_change: -Math.abs(Number(quantity)), // Negative for waste
                    type: 'WASTE',
                    reason: notes,
                    waste_cause_id,
                    cost_amount: costAmount
                });

            if (logError) throw logError;

            // 3. Update Ingredient Stock
            const { error: updateError } = await supabase
                .from('ingredients')
                .update({
                    stock_current: Number(ingredient.stock_current) - Math.abs(Number(quantity)),
                    updated_at: new Date().toISOString()
                })
                .eq('id', ingredient_id);

            if (updateError) throw updateError;

            res.status(201).json({ message: 'Waste logged successfully' });

        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error({ error }, 'Error logging waste');
            res.status(500).json({ error: 'Failed to log waste' });
        }
    }

    // Get Analytics
    async getStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orgIds = req.user!.organizationIds;
            const { startDate, endDate } = req.query;

            let query = supabase
                .from('inventory_logs')
                .select(`
                    quantity_change,
                    cost_amount,
                    created_at,
                    waste_causes (name),
                    ingredients (name, unit_id, units(abbreviation))
                `)
                .eq('type', 'WASTE')
                .in('organization_id', orgIds);

            if (startDate) query = query.gte('created_at', startDate);
            if (endDate) query = query.lte('created_at', endDate);

            const { data, error } = await query;

            if (error) throw error;

            res.json({ data });
        } catch (error) {
            logger.error({ error }, 'Error fetching waste stats');
            res.status(500).json({ error: 'Failed to fetch waste stats' });
        }
    }
}
