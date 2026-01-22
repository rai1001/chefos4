import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';

export class ProductionTasksController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { event_id, start_date, end_date } = req.query;
            const orgIds = req.user!.organizationIds;

            let query = supabase
                .from('production_tasks')
                .select(`
          *,
          recipe:recipes (id, name),
          assigned_user:users (id, email, full_name)
        `)
                .in('organization_id', orgIds)
                .order('scheduled_start', { ascending: true });

            if (event_id) {
                query = query.eq('event_id', event_id);
            }

            if (start_date && end_date) {
                query = query
                    .gte('scheduled_start', start_date)
                    .lte('scheduled_end', end_date);
            }

            const { data: tasks, error: tasksError } = await query;

            if (tasksError) throw tasksError;

            // Fetch dependencies for these tasks
            const taskIds = (tasks || []).map(t => t.id);
            let dependencies: any[] = [];

            if (taskIds.length > 0) {
                const { data: depsData, error: depsError } = await supabase
                    .from('task_dependencies')
                    .select('*')
                    .in('predecessor_task_id', taskIds);

                if (depsError) throw depsError;
                dependencies = depsData || [];
            }

            const data = (tasks || []).map(task => ({
                ...task,
                dependencies: dependencies
                    .filter(d => d.successor_task_id === task.id)
                    .map(d => d.predecessor_task_id)
            }));

            res.json({ data });
        } catch (error: any) {
            logger.error(error, 'Error fetching production tasks');
            res.status(500).json({ error: 'Failed to fetch production tasks' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const {
                title,
                description,
                event_id,
                recipe_id,
                scheduled_start,
                scheduled_end,
                estimated_duration_minutes,
                station,
                priority,
            } = req.body;

            const organizationId = req.user!.organizationIds[0];

            const { data, error } = await supabase
                .from('production_tasks')
                .insert({
                    organization_id: organizationId,
                    title,
                    description,
                    event_id,
                    recipe_id,
                    scheduled_start,
                    scheduled_end,
                    estimated_duration_minutes,
                    station,
                    priority,
                    status: 'PENDING',
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({ data });
        } catch (error: any) {
            logger.error(error, 'Error creating production task');
            res.status(500).json({ error: 'Failed to create production task' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;
            const updates = req.body;

            // Prevent updating immutable fields or organization_id injection
            delete updates.organization_id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('production_tasks')
                .update(updates)
                .eq('id', id)
                .in('organization_id', orgIds)
                .select()
                .single();

            if (error) throw error;

            res.json({ data });
        } catch (error: any) {
            logger.error(error, 'Error updating production task');
            res.status(500).json({ error: 'Failed to update production task' });
        }
    }

    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;

            const { error } = await supabase
                .from('production_tasks')
                .delete()
                .eq('id', id)
                .in('organization_id', orgIds);

            if (error) throw error;

            res.json({ message: 'Task deleted successfully' });
        } catch (error: any) {
            logger.error(error, 'Error deleting production task');
            res.status(500).json({ error: 'Failed to delete production task' });
        }
    }

    async generateFromEvent(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { eventId } = req.params;
            const { baseStartTime } = req.body;
            const orgIds = req.user!.organizationIds;

            // Verify event ownership
            const { data: event } = await supabase
                .from('events')
                .select('id')
                .eq('id', eventId)
                .in('organization_id', orgIds)
                .single();

            if (!event) {
                throw new AppError(404, 'Event not found');
            }

            // Call RPC function
            const { data: count, error } = await supabase.rpc(
                'generate_production_tasks_from_event',
                {
                    p_event_id: eventId,
                    p_base_start_time: baseStartTime || new Date().toISOString(),
                }
            );

            if (error) throw error;

            res.json({
                message: 'Tasks generated successfully',
                count
            });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error generating tasks from event');
            res.status(500).json({ error: 'Failed to generate tasks' });
        }
    }
}
