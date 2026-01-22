import { supabase } from '@/config/supabase';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { ScheduleValidationService } from '@/services/schedule-validation.service';

export class ScheduleService {
    private validator = new ScheduleValidationService();

    async createMonth(params: { organizationId: string; month: string; createdBy: string }) {
        const { organizationId, month, createdBy } = params;
        const monthDate = this.normalizeMonth(month);

        const { data: existing } = await supabase
            .from('schedule_months')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('month', monthDate)
            .maybeSingle();

        if (existing) {
            return existing;
        }

        const { data, error } = await supabase
            .from('schedule_months')
            .insert({
                organization_id: organizationId,
                month: monthDate,
                status: 'DRAFT',
                created_by: createdBy,
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error creating schedule month');
            throw new AppError(500, 'Failed to create schedule month');
        }

        return data;
    }

    async getMonth(params: { id: string; organizationIds: string[] }) {
        const { id, organizationIds } = params;

        const { data, error } = await supabase
            .from('schedule_months')
            .select(
                `
                *,
                shifts (
                    id,
                    date,
                    start_time,
                    end_time,
                    shift_code,
                    station,
                    status,
                    assignments:shift_assignments (
                        id,
                        staff_id,
                        status,
                        staff:staff_profiles (
                            id,
                            role_in_kitchen,
                            member:organization_members (
                                id,
                                user:users (id, name, email)
                            )
                        )
                    )
                )
            `
            )
            .eq('id', id)
            .in('organization_id', organizationIds)
            .single();

        if (error) {
            logger.error(error, 'Error fetching schedule month');
            throw new AppError(500, 'Failed to fetch schedule month');
        }

        const monthDate = data?.month;
        let timeOff: any[] = [];

        if (monthDate) {
            const staffIds = await this.getStaffIds(organizationIds);
            if (staffIds.length === 0) {
                return { ...data, time_off: [] };
            }
            const { data: timeOffData } = await supabase
                .from('staff_time_off')
                .select(
                    `
                    *,
                    staff:staff_profiles (
                        id,
                        member:organization_members (
                            id,
                            user:users (id, name, email)
                        )
                    )
                `
                )
                .eq('status', 'APPROVED')
                .gte('end_date', monthDate)
                .lte('start_date', this.endOfMonth(monthDate))
                .in('staff_id', staffIds);

            timeOff = timeOffData || [];
        }

        return { ...data, time_off: timeOff };
    }

    async publishMonth(params: { id: string; organizationIds: string[]; userId: string }) {
        const { id, organizationIds, userId } = params;

        const { data: month, error } = await supabase
            .from('schedule_months')
            .update({
                status: 'PUBLISHED',
                published_by: userId,
                published_at: new Date().toISOString(),
            })
            .eq('id', id)
            .in('organization_id', organizationIds)
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error publishing schedule month');
            throw new AppError(500, 'Failed to publish schedule month');
        }

        await supabase
            .from('shifts')
            .update({ status: 'PUBLISHED' })
            .eq('schedule_month_id', id);

        return month;
    }

    async createShift(params: {
        organizationId: string;
        scheduleMonthId: string;
        date: string;
        startTime: string;
        endTime: string;
        shiftCode: string;
        station?: string | null;
        templateId?: string | null;
    }) {
        const { data, error } = await supabase
            .from('shifts')
            .insert({
                organization_id: params.organizationId,
                schedule_month_id: params.scheduleMonthId,
                date: params.date,
                start_time: params.startTime,
                end_time: params.endTime,
                shift_code: params.shiftCode,
                station: params.station || null,
                template_id: params.templateId || null,
                status: 'DRAFT',
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error creating shift');
            throw new AppError(500, 'Failed to create shift');
        }

        return data;
    }

    async updateShift(params: {
        id: string;
        organizationIds: string[];
        date?: string;
        startTime?: string;
        endTime?: string;
        shiftCode?: string;
        station?: string | null;
    }) {
        const { id, organizationIds, ...payload } = params;

        const { data: shift, error: shiftError } = await supabase
            .from('shifts')
            .select(
                `
                *,
                assignments:shift_assignments (staff_id)
            `
            )
            .eq('id', id)
            .in('organization_id', organizationIds)
            .single();

        if (shiftError || !shift) {
            throw new AppError(404, 'Shift not found');
        }

        if ((payload.startTime || payload.endTime) && shift.assignments?.length) {
            for (const assignment of shift.assignments) {
                const overlaps = await this.validator.checkOverlap({
                    staffId: assignment.staff_id,
                    date: payload.date || shift.date,
                    startTime: payload.startTime || shift.start_time,
                    endTime: payload.endTime || shift.end_time,
                    excludeShiftId: id,
                });
                if (overlaps.length) {
                    throw new AppError(400, 'Shift overlaps with existing assignment');
                }
            }
        }

        const { data, error } = await supabase
            .from('shifts')
            .update({
                date: payload.date ?? undefined,
                start_time: payload.startTime ?? undefined,
                end_time: payload.endTime ?? undefined,
                shift_code: payload.shiftCode ?? undefined,
                station: payload.station ?? undefined,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error updating shift');
            throw new AppError(500, 'Failed to update shift');
        }

        return data;
    }

    async updateAssignments(params: {
        shiftId: string;
        organizationIds: string[];
        staffIds: string[];
    }) {
        const { shiftId, organizationIds, staffIds } = params;

        const { data: shift, error: shiftError } = await supabase
            .from('shifts')
            .select('id, date, start_time, end_time')
            .eq('id', shiftId)
            .in('organization_id', organizationIds)
            .single();

        if (shiftError || !shift) {
            throw new AppError(404, 'Shift not found');
        }

        for (const staffId of staffIds) {
            const timeOff = await this.validator.checkTimeOffConflict({
                staffId,
                date: shift.date,
            });
            if (timeOff.length) {
                throw new AppError(400, 'Staff has approved time off on this date');
            }

            const overlaps = await this.validator.checkOverlap({
                staffId,
                date: shift.date,
                startTime: shift.start_time,
                endTime: shift.end_time,
                excludeShiftId: shiftId,
            });
            if (overlaps.length) {
                throw new AppError(400, 'Staff has overlapping shift');
            }
        }

        await supabase.from('shift_assignments').delete().eq('shift_id', shiftId);

        if (staffIds.length === 0) {
            return [];
        }

        const inserts = staffIds.map((staffId) => ({
            shift_id: shiftId,
            staff_id: staffId,
            status: 'ASSIGNED',
        }));

        const { data, error } = await supabase
            .from('shift_assignments')
            .insert(inserts)
            .select();

        if (error) {
            logger.error(error, 'Error updating shift assignments');
            throw new AppError(500, 'Failed to update shift assignments');
        }

        return data;
    }

    private normalizeMonth(month: string) {
        const date = month.length === 7 ? `${month}-01` : month;
        return date;
    }

    private endOfMonth(month: string) {
        const base = new Date(`${month}T00:00:00Z`);
        const year = base.getUTCFullYear();
        const monthIndex = base.getUTCMonth();
        const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
        return lastDay.toISOString().slice(0, 10);
    }

    private async getStaffIds(organizationIds: string[]) {
        const { data } = await supabase
            .from('staff_profiles')
            .select('id')
            .in('organization_id', organizationIds);

        return (data || []).map((profile) => profile.id);
    }
}
