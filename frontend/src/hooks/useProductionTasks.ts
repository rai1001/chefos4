import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';

export interface ProductionTask {
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    progress_pct: number | null;
    recipe?: { name: string };
}

export function useProductionTasks(filters?: { event_id?: string }) {
    return useQuery({
        queryKey: ['production-tasks', filters],
        queryFn: async () => {
            let query = supabase
                .from('production_tasks')
                .select('*, recipe:recipes(name)')
                .order('scheduled_start', { ascending: true });

            if (filters?.event_id && filters.event_id !== 'all') {
                query = query.eq('event_id', filters.event_id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as ProductionTask[];
        },
    });
}

