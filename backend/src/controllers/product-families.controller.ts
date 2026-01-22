import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';


export class ProductFamiliesController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orgIds = req.user!.organizationIds;


            const { data, error } = await supabase
                .from('product_families')
                .select('*')
                .in('organization_id', orgIds)
                .order('name');


            if (error) throw error;


            res.json({ data, total: data?.length || 0 });
        } catch (error) {
            logger.error('Error fetching product families:', error);
            res.status(500).json({ error: 'Failed to fetch product families' });
        }
    }


    async getById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;


            const { data, error } = await supabase
                .from('product_families')
                .select('*')
                .eq('id', id)
                .in('organization_id', orgIds)
                .single();


            if (error || !data) {
                throw new AppError(404, 'Product family not found');
            }


            res.json({ data });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Error fetching product family:', error);
            res.status(500).json({ error: 'Failed to fetch product family' });
        }
    }


    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, description, safety_buffer_pct } = req.body;
            const organizationId = req.user!.organizationIds[0]; // Primera org del usuario


            const { data, error } = await supabase
                .from('product_families')
                .insert({
                    organization_id: organizationId,
                    name,
                    description,
                    safety_buffer_pct: safety_buffer_pct || 1.10,
                })
                .select()
                .single();


            if (error) {
                if (error.code === '23505') {
                    throw new AppError(409, 'Product family with this name already exists');
                }
                throw error;
            }


            res.status(201).json({ data });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Error creating product family:', error);
            res.status(500).json({ error: 'Failed to create product family' });
        }
    }


    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, description, safety_buffer_pct } = req.body;
            const orgIds = req.user!.organizationIds;


            // Verificar que existe y pertenece a la org del usuario
            const { data: existing } = await supabase
                .from('product_families')
                .select('id')
                .eq('id', id)
                .in('organization_id', orgIds)
                .single();


            if (!existing) {
                throw new AppError(404, 'Product family not found');
            }


            const { data, error } = await supabase
                .from('product_families')
                .update({ name, description, safety_buffer_pct })
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
            logger.error('Error updating product family:', error);
            res.status(500).json({ error: 'Failed to update product family' });
        }
    }


    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;


            // Verificar si tiene ingredientes asociados
            const { count } = await supabase
                .from('ingredients')
                .select('id', { count: 'exact', head: true })
                .eq('family_id', id)
                .is('deleted_at', null);


            if (count && count > 0) {
                throw new AppError(
                    400,
                    `Cannot delete family with ${count} associated ingredients`
                );
            }


            const { error } = await supabase
                .from('product_families')
                .delete()
                .eq('id', id)
                .in('organization_id', orgIds);


            if (error) throw error;


            res.json({ message: 'Product family deleted successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Error deleting product family:', error);
            res.status(500).json({ error: 'Failed to delete product family' });
        }
    }
}
