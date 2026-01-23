import { api } from './api';

export interface ShiftAssignment {
    id: string;
    staff_id: string;
    status: string;
    staff?: {
        id: string;
        member?: { user?: { id: string; name: string; email: string } };
    };
}

export interface Shift {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    shift_code: string;
    station?: string | null;
    status: string;
    assignments?: ShiftAssignment[];
}

export interface ScheduleMonth {
    id: string;
    month: string;
    status: string;
    shifts?: Shift[];
    time_off?: any[];
}

export const scheduleService = {
    async createMonth(payload: { month: string }) {
        const response = await api.post('/schedules/months', payload);
        return response.data.data as ScheduleMonth;
    },

    async getMonth(id: string) {
        const response = await api.get(`/schedules/months/${id}`);
        return response.data.data as ScheduleMonth;
    },

    async publishMonth(id: string) {
        const response = await api.post(`/schedules/months/${id}/publish`);
        return response.data.data as ScheduleMonth;
    },

    async validateMonth(id: string) {
        const response = await api.post(`/schedules/months/${id}/validate`);
        return response.data.data as { errors: any[]; warnings: any[] };
    },

    async generateMonth(id: string, payload?: { from?: string; to?: string }) {
        const response = await api.post(`/schedules/months/${id}/generate`, payload || {});
        return response.data.data as { created_shifts: number; created_assignments: number; warnings: string[] };
    },

    async createShift(payload: {
        schedule_month_id: string;
        date: string;
        start_time: string;
        end_time: string;
        shift_code: string;
        station?: string | null;
    }) {
        const response = await api.post('/schedules/shifts', payload);
        return response.data.data as Shift;
    },

    async updateShift(id: string, payload: Partial<Omit<Shift, 'id'>>) {
        const response = await api.patch(`/schedules/shifts/${id}`, payload);
        return response.data.data as Shift;
    },

    async updateAssignments(shiftId: string, staff_ids: string[]) {
        const response = await api.patch(`/schedules/shifts/${shiftId}/assignments`, { staff_ids });
        return response.data.data as ShiftAssignment[];
    },
};
