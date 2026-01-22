import { api } from './api';

export interface TimeOffRecord {
    id: string;
    staff_id: string;
    type: 'VACATION' | 'SICK_LEAVE' | 'OTHER';
    start_date: string;
    end_date: string;
    status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
    counted_days: number;
    notes?: string | null;
    staff?: {
        id: string;
        member?: { user?: { id: string; name: string; email: string } };
    };
}

export const timeOffService = {
    async list(params?: { status?: string }) {
        const response = await api.get('/time-off', { params });
        return response.data.data as TimeOffRecord[];
    },

    async request(payload: {
        staff_id: string;
        type: 'VACATION' | 'SICK_LEAVE' | 'OTHER';
        start_date: string;
        end_date: string;
        notes?: string;
    }) {
        const response = await api.post('/time-off', payload);
        return response.data.data as TimeOffRecord;
    },

    async approve(id: string, policy?: 'CALENDAR' | 'BUSINESS') {
        const response = await api.patch(`/time-off/${id}/approve`, { policy });
        return response.data.data as TimeOffRecord;
    },

    async reject(id: string) {
        const response = await api.patch(`/time-off/${id}/reject`);
        return response.data.data as TimeOffRecord;
    },
};
