import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export class UnitsController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('units')
                .select('id, name, abbreviation, type')
                .order('name');

            if (error) throw error;

            res.json({ data });
        } catch (error: any) {
            logger.error('Error fetching units:', error);
            res.status(500).json({ error: 'Failed to fetch units' });
        }
    }
}
