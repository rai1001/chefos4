import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface Event {
    id: string;
    organization_id: string;
    name: string;
    date_start: string;
    date_end?: string;
    event_type: 'BANQUET' | 'A_LA_CARTE' | 'SPORTS_MULTI' | 'COFFEE' | 'BUFFET';
    pax: number;
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    location?: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface EventFilters {
    start_date?: string;
    end_date?: string;
    status?: string;
}

export function useEvents(filters?: EventFilters) {
    return useQuery({
        queryKey: ['events', filters],
        queryFn: async () => {
            const response = await api.get<{ data: Event[] }>('/events', { params: filters });
            return response.data.data;
        },
    });
}

