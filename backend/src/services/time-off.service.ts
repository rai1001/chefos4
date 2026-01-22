import { supabase } from '@/config/supabase';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { VacationCalculatorService, VacationPolicy } from '@/services/vacation-calculator.service';

export class TimeOffService {
    private calculator = new VacationCalculatorService();

    async listTimeOff(organizationIds: string[], status?: string) {
        const { data: staffProfiles, error: staffError } = await supabase
            .from('staff_profiles')
            .select('id')
            .in('organization_id', organizationIds);

        if (staffError) {
            logger.error(staffError, 'Error fetching staff profiles for time off');
            throw new AppError(500, 'Failed to fetch time off');
        }

        const staffIds = (staffProfiles || []).map((profile) => profile.id);

        if (staffIds.length === 0) {
            return [];
        }

        let query = supabase
            .from('staff_time_off')
            .select(
                `
                *,
                staff:staff_profiles (
                    id,
                    role_in_kitchen,
                    active,
                    member:organization_members (
                        id,
                        role,
                        user:users (id, name, email)
                    )
                )
            `
            )
            .in('staff_id', staffIds);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            logger.error(error, 'Error listing time off');
            throw new AppError(500, 'Failed to fetch time off');
        }

        return data || [];
    }

    async requestTimeOff(params: {
        staffId: string;
        type: string;
        startDate: string;
        endDate: string;
        notes?: string;
        createdBy?: string;
    }) {
        const { staffId, type, startDate, endDate, notes, createdBy } = params;

        const { data, error } = await supabase
            .from('staff_time_off')
            .insert({
                staff_id: staffId,
                type,
                start_date: startDate,
                end_date: endDate,
                status: 'REQUESTED',
                notes: notes || null,
                created_by: createdBy || null,
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error requesting time off');
            throw new AppError(500, 'Failed to request time off');
        }

        return data;
    }

    async approveTimeOff(params: {
        id: string;
        approvedBy: string;
        policy?: VacationPolicy;
    }) {
        const { id, approvedBy, policy = 'CALENDAR' } = params;

        const { data: timeOff, error } = await supabase
            .from('staff_time_off')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !timeOff) {
            throw new AppError(404, 'Time off request not found');
        }

        const countedDays = this.calculator.calculateDays(
            timeOff.start_date,
            timeOff.end_date,
            policy
        );

        const { data: updated, error: updateError } = await supabase
            .from('staff_time_off')
            .update({
                status: 'APPROVED',
                approved_by: approvedBy,
                counted_days: countedDays,
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logger.error(updateError, 'Error approving time off');
            throw new AppError(500, 'Failed to approve time off');
        }

        if (timeOff.type === 'VACATION') {
            await this.applyVacationBalance(timeOff.staff_id, countedDays, timeOff.start_date);
        }

        await this.markAssignmentsAbsent(timeOff.staff_id, timeOff.start_date, timeOff.end_date);

        return updated;
    }

    async rejectTimeOff(params: { id: string; approvedBy: string }) {
        const { id, approvedBy } = params;

        const { data, error } = await supabase
            .from('staff_time_off')
            .update({
                status: 'REJECTED',
                approved_by: approvedBy,
                counted_days: 0,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error rejecting time off');
            throw new AppError(500, 'Failed to reject time off');
        }

        return data;
    }

    private async applyVacationBalance(staffId: string, countedDays: number, startDate: string) {
        const currentYear = new Date(`${startDate}T00:00:00Z`).getUTCFullYear();

        const { data: contract } = await supabase
            .from('staff_contracts')
            .select('vacation_days_per_year')
            .eq('staff_id', staffId)
            .maybeSingle();

        const allocated = contract?.vacation_days_per_year || 0;

        const { data: balance } = await supabase
            .from('staff_vacation_balance')
            .select('*')
            .eq('staff_id', staffId)
            .eq('year', currentYear)
            .maybeSingle();

        const daysUsed = (balance?.days_used || 0) + countedDays;
        const daysAllocated = balance?.days_allocated || allocated;
        const daysRemaining = Math.max(daysAllocated - daysUsed, 0);

        const { error } = await supabase.from('staff_vacation_balance').upsert({
            staff_id: staffId,
            year: currentYear,
            days_allocated: daysAllocated,
            days_used: daysUsed,
            days_remaining: daysRemaining,
            updated_at: new Date().toISOString(),
        });

        if (error) {
            logger.error(error, 'Error updating vacation balance');
            throw new AppError(500, 'Failed to update vacation balance');
        }
    }

    private async markAssignmentsAbsent(staffId: string, startDate: string, endDate: string) {
        const { data: shifts, error } = await supabase
            .from('shifts')
            .select('id')
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) {
            logger.error(error, 'Error fetching shifts for time off');
            throw new AppError(500, 'Failed to update shift assignments');
        }

        const shiftIds = (shifts || []).map((shift) => shift.id);
        if (shiftIds.length === 0) {
            return;
        }

        const { error: updateError } = await supabase
            .from('shift_assignments')
            .update({ status: 'ABSENT' })
            .eq('staff_id', staffId)
            .in('shift_id', shiftIds);

        if (updateError) {
            logger.error(updateError, 'Error marking assignments absent');
            throw new AppError(500, 'Failed to update shift assignments');
        }
    }
}
