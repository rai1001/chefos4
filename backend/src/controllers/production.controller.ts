import { Request, Response } from 'express';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';

export class ProductionController {
    async getTasks(req: Request, res: Response) {
        try {
            const { event_id } = req.query;
            let query = supabase
                .from('production_tasks')
                .select('*, recipe:recipes(name)')
                .order('scheduled_start', { ascending: true });

            if (event_id) {
                query = query.eq('event_id', event_id);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json(data);
        } catch (error) {
            logger.error('Error fetching production tasks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async createTask(req: Request, res: Response) {
        try {
            const { data, error } = await supabase
                .from('production_tasks')
                .insert(req.body)
                .select()
                .single();

            if (error) throw error;

            res.status(201).json(data);
        } catch (error) {
            logger.error('Error creating production task:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateTask(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('production_tasks')
                .update(req.body)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json(data);
        } catch (error) {
            logger.error('Error updating production task:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async autoGenerateTasks(req: Request, res: Response) {
        try {
            const { event_id, base_start_time } = req.body;

            const { data, error } = await supabase.rpc('generate_production_tasks_from_event', {
                p_event_id: event_id,
                p_base_start_time: base_start_time
            });

            if (error) throw error;

            res.json({ message: 'Tasks generated successfully', count: data });
        } catch (error) {
            logger.error('Error generating production tasks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
