import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';

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
            return data;
        },
    });
}
