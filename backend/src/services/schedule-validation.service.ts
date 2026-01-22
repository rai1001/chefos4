import { supabase } from '@/config/supabase';

export class ScheduleValidationService {
    async checkTimeOffConflict(params: { staffId: string; date: string }) {
        const { staffId, date } = params;
        const { data, error } = await supabase
            .from('staff_time_off')
            .select('id, type, start_date, end_date')
            .eq('staff_id', staffId)
            .eq('status', 'APPROVED')
            .lte('start_date', date)
            .gte('end_date', date);

        if (error) throw error;
        return data || [];
    }

    async checkOverlap(params: {
        staffId: string;
        date: string;
        startTime: string;
        endTime: string;
        excludeShiftId?: string;
    }) {
        const { staffId, date, startTime, endTime, excludeShiftId } = params;
        const { data, error } = await supabase
            .from('shift_assignments')
            .select('shift:shifts (id, date, start_time, end_time)')
            .eq('staff_id', staffId);

        if (error) throw error;

        const overlaps =
            data
                ?.map((row: any) => row.shift)
                .filter((shift: any) => shift && shift.date === date)
                .filter((shift: any) => shift.id !== excludeShiftId)
                .filter((shift: any) => this.overlaps(startTime, endTime, shift.start_time, shift.end_time)) || [];

        return overlaps;
    }

    private overlaps(startA: string, endA: string, startB: string, endB: string) {
        return startA < endB && endA > startB;
    }
}
