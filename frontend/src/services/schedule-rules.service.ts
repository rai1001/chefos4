import { api } from './api';

export interface StaffScheduleRules {
    id: string;
    staff_id: string;
    allowed_shift_codes: string[];
    rotation_mode: string;
    preferred_days_off?: string[] | null;
    max_consecutive_days?: number | null;
    requires_weekend_off_per_month: boolean;
}

export interface OrganizationScheduleRules {
    id: string;
    weekend_definition: string;
    enforce_weekend_off_hard: boolean;
    rotation_enabled: boolean;
}

export const scheduleRulesService = {
    async getStaffRules(staffId: string) {
        const response = await api.get(`/schedule-rules/staff/${staffId}`);
        return response.data.data as StaffScheduleRules | null;
    },

    async updateStaffRules(staffId: string, payload: Partial<StaffScheduleRules>) {
        const response = await api.patch(`/schedule-rules/staff/${staffId}`, payload);
        return response.data.data as StaffScheduleRules;
    },

    async getOrgRules() {
        const response = await api.get('/schedule-rules/org');
        return response.data.data as OrganizationScheduleRules | null;
    },

    async updateOrgRules(payload: Partial<OrganizationScheduleRules>) {
        const response = await api.patch('/schedule-rules/org', payload);
        return response.data.data as OrganizationScheduleRules;
    },
};
