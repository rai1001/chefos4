
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';

export class OrganizationsController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;

            // Fetch organizations where the user is a member
            const { data, error } = await supabase
                .from('organizations')
                .select('*, organization_members!inner(role)')
                .eq('organization_members.user_id', userId);

            if (error) {
                logger.error(error, 'Error fetching user organizations');
                throw new AppError(500, 'Failed to fetch organizations');
            }

            res.json({ data: data || [] });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Organizations getAll error');
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name } = req.body;
            const userId = req.user!.id;

            // 1. Create Organization
            const { data: newOrg, error: orgError } = await supabase
                .from('organizations')
                .insert({ name, plan: 'FREE' })
                .select()
                .single();

            if (orgError || !newOrg) {
                logger.error(orgError, 'Error creating organization');
                throw new AppError(500, 'Failed to create organization');
            }

            // 2. Add creator as ORG_ADMIN (or AREA_DIRECTOR if they already have multiple)
            const { error: memberError } = await supabase
                .from('organization_members')
                .insert({
                    user_id: userId,
                    organization_id: newOrg.id,
                    role: 'ORG_ADMIN'
                });

            if (memberError) {
                logger.error(memberError, 'Error creating organization membership');
                throw new AppError(500, 'Failed to link user to new organization');
            }

            res.status(201).json({ data: newOrg });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Organizations create error');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
