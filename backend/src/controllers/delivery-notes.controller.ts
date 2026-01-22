import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { DeliveryNoteImportService } from '@/services/delivery-note-import.service';
import { logger } from '@/utils/logger';

export class DeliveryNotesController {
    private importService = new DeliveryNoteImportService();

    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('delivery_notes')
                .select(`
          *,
          items:delivery_note_items (
            id,
            description,
            quantity,
            unit_price,
            ingredient_id,
            unit_id,
            status
          )
        `)
                .in('organization_id', req.user!.organizationIds)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ data });
        } catch (error) {
            logger.error('Error listing delivery notes:', error);
            res.status(500).json({ error: 'Failed to fetch delivery notes' });
        }
    }

    async getById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('delivery_notes')
                .select(`
          *,
          items:delivery_note_items (
            id,
            description,
            quantity,
            unit_price,
            ingredient_id,
            unit_id,
            status
          )
        `)
                .eq('id', id)
                .in('organization_id', req.user!.organizationIds)
                .single();

            if (error) throw error;
            res.json({ data });
        } catch (error) {
            logger.error('Error fetching delivery note:', error);
            res.status(500).json({ error: 'Failed to fetch delivery note' });
        }
    }

    async updateItem(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const { data, error } = await supabase
                .from('delivery_note_items')
                .update(updateData)
                .eq('id', id)
                .in('organization_id', req.user!.organizationIds)
                .select()
                .single();

            if (error) throw error;
            res.json({ data });
        } catch (error) {
            logger.error('Error updating delivery note item:', error);
            res.status(500).json({ error: 'Failed to update item' });
        }
    }

    async importToInventory(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { item_updates } = req.body;
            const organizationId = req.user!.organizationIds[0];

            await this.importService.ensureItems(id, organizationId);

            if (Array.isArray(item_updates) && item_updates.length > 0) {
                await this.importService.updateItems(item_updates, req.user!.organizationIds);
            }

            const result = await this.importService.importToInventory({
                deliveryNoteId: id,
                organizationId,
                userId: req.user!.id,
            });

            res.json({ data: result });
        } catch (error: any) {
            logger.error('Error importing delivery note:', error);
            res.status(500).json({ error: error.message || 'Failed to import delivery note' });
        }
    }
}
