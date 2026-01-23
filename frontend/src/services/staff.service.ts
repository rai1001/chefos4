import { api } from './api';

export interface StaffProfile {
    id: string;
    display_name?: string | null;
    contact_email?: string | null;
    staff_type?: string | null;
    role_in_kitchen?: string | null;
    skills?: string[] | null;
    active: boolean;
    member?: {
        id: string;
        role: string;
        user?: { id: string; name: string; email: string };
    };
    contract?: {
        weekly_hours_target?: number | null;
        max_weekly_hours?: number | null;
        vacation_days_per_year?: number | null;
        rest_min_hours_between_shifts?: number | null;
    } | null;
    vacation_balance?: Array<{
        year: number;
        days_allocated: number;
        days_used: number;
        days_remaining: number;
    }>;
}

export const staffService = {
    async list() {
        const response = await api.get('/staff');
        return response.data.data as StaffProfile[];
    },

    async create(payload: {
        member_id?: string | null;
        display_name?: string | null;
        contact_email?: string | null;
        staff_type?: string | null;
        role_in_kitchen?: string | null;
        skills?: string[];
        active?: boolean;
        contract?: {
            weekly_hours_target?: number | null;
            max_weekly_hours?: number | null;
            vacation_days_per_year?: number | null;
            rest_min_hours_between_shifts?: number | null;
        };
    }) {
        const response = await api.post('/staff', payload);
        return response.data.data as StaffProfile;
    },

    async update(id: string, payload: Partial<Omit<StaffProfile, 'id' | 'member'>>) {
        const response = await api.patch(`/staff/${id}`, payload);
        return response.data.data as StaffProfile;
    },

    async getVacationBalance(id: string, year: number) {
        const response = await api.get(`/staff/${id}/vacation-balance`, {
            params: { year },
        });
        return response.data.data as {
            year: number;
            days_allocated: number;
            days_used: number;
            days_remaining: number;
        } | null;
    },
};
