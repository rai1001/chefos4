import { supabase } from '@/config/supabase';
import { AppError } from '@/utils/errors';

interface ValidationIssue {
    level: 'error' | 'warning';
    message: string;
    staff_id?: string;
    date?: string;
    shift_id?: string;
}

export class ScheduleRulesValidator {
    async validateMonth(params: { monthId: string; organizationIds: string[] }) {
        const { monthId, organizationIds } = params;

        const { data: month, error } = await supabase
            .from('schedule_months')
            .select(
                `
                id,
                month,
                organization_id,
                shifts (
                    id,
                    date,
                    start_time,
                    end_time,
                    shift_code,
                    assignments:shift_assignments (
                        id,
                        staff_id
                    )
                )
            `
            )
            .eq('id', monthId)
            .in('organization_id', organizationIds)
            .single();

        if (error || !month) {
            throw new AppError(404, 'Schedule month not found');
        }

        const { data: staffRules } = await supabase
            .from('staff_schedule_rules')
            .select('*')
            .eq('organization_id', month.organization_id);

        const { data: orgRules } = await supabase
            .from('organization_schedule_rules')
            .select('*')
            .eq('organization_id', month.organization_id)
            .maybeSingle();

        const issues: ValidationIssue[] = [];
        const staffRulesByStaff = new Map(
            (staffRules || []).map((rule: any) => [rule.staff_id, rule])
        );
        const assignmentsByStaff = this.buildAssignments(month.shifts || []);

        for (const [staffId, assignments] of assignmentsByStaff.entries()) {
            const rules = staffRulesByStaff.get(staffId);
            if (!rules) {
                continue;
            }

            const allowed = rules.allowed_shift_codes || [];
            for (const assignment of assignments) {
                if (allowed.length > 0 && !allowed.includes(assignment.shift_code)) {
                    issues.push({
                        level: 'error',
                        message: `Turno ${assignment.shift_code} no permitido`,
                        staff_id: staffId,
                        date: assignment.date,
                        shift_id: assignment.shift_id,
                    });
                }
            }

            if (rules.rotation_mode && rules.rotation_mode !== 'NONE') {
                const uniqueCodes = new Set(assignments.map((item) => item.shift_code));
                if (uniqueCodes.size <= 1) {
                    issues.push({
                        level: 'warning',
                        message: 'Rotacion activada pero sin cambios de turno en el mes',
                        staff_id: staffId,
                    });
                }
            }

            if (rules.max_consecutive_days) {
                const maxStreak = this.maxConsecutiveDays(assignments);
                if (maxStreak > rules.max_consecutive_days) {
                    issues.push({
                        level: 'warning',
                        message: `Supera maximo de dias consecutivos (${maxStreak})`,
                        staff_id: staffId,
                    });
                }
            }
        }

        const enforceWeekendHard = orgRules?.enforce_weekend_off_hard ?? true;
        const weekendDefinition = orgRules?.weekend_definition || 'SAT_SUN';
        const staffIds = Array.from(assignmentsByStaff.keys());

        for (const staffId of staffIds) {
            const rules = staffRulesByStaff.get(staffId);
            if (rules && rules.requires_weekend_off_per_month === false) {
                continue;
            }

            const hasWeekendOff = this.hasWeekendOff(
                assignmentsByStaff.get(staffId) || [],
                weekendDefinition,
                month.month
            );
            if (!hasWeekendOff) {
                issues.push({
                    level: enforceWeekendHard ? 'error' : 'warning',
                    message: 'No cumple con finde libre en el mes',
                    staff_id: staffId,
                });
            }
        }

        return {
            errors: issues.filter((issue) => issue.level === 'error'),
            warnings: issues.filter((issue) => issue.level === 'warning'),
        };
    }

    private buildAssignments(shifts: any[]) {
        const byStaff = new Map<string, Array<{ shift_id: string; date: string; shift_code: string }>>();

        for (const shift of shifts || []) {
            for (const assignment of shift.assignments || []) {
                if (!byStaff.has(assignment.staff_id)) {
                    byStaff.set(assignment.staff_id, []);
                }
                byStaff.get(assignment.staff_id)!.push({
                    shift_id: shift.id,
                    date: shift.date,
                    shift_code: shift.shift_code,
                });
            }
        }

        for (const entry of byStaff.values()) {
            entry.sort((a, b) => a.date.localeCompare(b.date));
        }

        return byStaff;
    }

    private maxConsecutiveDays(assignments: Array<{ date: string }>) {
        if (assignments.length === 0) return 0;

        const dates = assignments.map((item) => item.date).sort();
        let maxStreak = 1;
        let streak = 1;

        for (let i = 1; i < dates.length; i += 1) {
            const prev = new Date(`${dates[i - 1]}T00:00:00Z`);
            const current = new Date(`${dates[i]}T00:00:00Z`);
            const diff = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
                streak += 1;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1;
            }
        }

        return maxStreak;
    }

    private hasWeekendOff(
        assignments: Array<{ date: string }>,
        weekendDefinition: string,
        monthDate: string
    ) {
        const assignedDates = new Set(assignments.map((item) => item.date));
        const dates = assignments.map((item) => item.date);

        if (dates.length === 0) {
            return true;
        }

        const start = new Date(`${monthDate}T00:00:00Z`);
        const year = start.getUTCFullYear();
        const month = start.getUTCMonth();
        const lastDay = new Date(Date.UTC(year, month + 1, 0));

        for (let day = new Date(start); day <= lastDay; day.setUTCDate(day.getUTCDate() + 1)) {
            const dayOfWeek = day.getUTCDay();
            const dateStr = day.toISOString().slice(0, 10);

            if (weekendDefinition === 'FRI_SAT' && dayOfWeek === 5) {
                const sat = new Date(day);
                sat.setUTCDate(day.getUTCDate() + 1);
                const satStr = sat.toISOString().slice(0, 10);
                if (!assignedDates.has(dateStr) && !assignedDates.has(satStr)) {
                    return true;
                }
            }

            if (weekendDefinition === 'SAT_SUN' && dayOfWeek === 6) {
                const sun = new Date(day);
                sun.setUTCDate(day.getUTCDate() + 1);
                const sunStr = sun.toISOString().slice(0, 10);
                if (!assignedDates.has(dateStr) && !assignedDates.has(sunStr)) {
                    return true;
                }
            }
        }

        return false;
    }
}
