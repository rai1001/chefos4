
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { supabase } from '@/config/supabase';

export interface Notification {
    id: string;
    organization_id: string;
    user_id: string | null;
    type: 'LOW_STOCK' | 'CUTOFF_WARNING' | 'ORDER_RECEIVED' | 'ORDER_LATE' | 'EVENT_REMINDER' | 'SYSTEM';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    title: string;
    message: string;
    data: any;
    action_url: string | null;
    read: boolean;
    read_at: string | null;
    created_at: string;
    expires_at: string | null;
}

export function useNotifications() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications');
            return res.data.data as Notification[];
        },
        refetchInterval: 60000, // Poll every 1m as fallback
    });

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const markAsRead = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            await api.post('/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    return {
        ...query,
        markAsRead,
        markAllAsRead,
    };
}
