import { supabase } from '@/config/supabase';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { ScheduleCoverageService } from '@/services/schedule-coverage.service';

type CoverageRule = {
    weekday: number;
    shift_code: string;
    required_staff: number;
    station?: string | null;
};

type CoverageOverride = {
    date: string;
    shift_code: string;
    required_staff: number;
    station?: string | null;
};

type StaffRule = {
    staff_id: string;
    allowed_shift_codes?: string[] | null;
    max_consecutive_days?: number | null;
};

type StaffTimeOff = {
    staff_id: string;
    start_date: string;
    end_date: string;
};

export class ScheduleGeneratorService {
    private coverageService = new ScheduleCoverageService();

    async generate(params: { monthId: string; organizationIds: string[]; from?: string; to?: string }) {
        const { monthId, organizationIds, from, to } = params;

        const { data: month, error } = await supabase
            .from('schedule_months')
            .select('id, month, organization_id')
            .eq('id', monthId)
            .in('organization_id', organizationIds)
            .single();

        if (error || !month) {
            throw new AppError(404, 'Schedule month not found');
        }

        const rangeStart = from || this.normalizeDate(month.month);
        const rangeEnd = to || this.endOfMonth(month.month);

        const coverage = await this.coverageService.getCoverageRules({
            organizationId: month.organization_id,
            from: rangeStart,
            to: rangeEnd,
        });
        const dayRules = coverage.day_rules || [];
        const overrides = coverage.date_overrides || [];
        const effectiveDayRules = dayRules.length > 0 ? dayRules : this.defaultCoverageRules();

        const templateMap = await this.loadShiftTemplates(month.organization_id);

        const { data: staffProfiles } = await supabase
            .from('staff_profiles')
            .select('id, active')
            .eq('organization_id', month.organization_id);

        const staffIds = (staffProfiles || [])
            .filter((profile: any) => profile.active !== false)
            .map((profile: any) => profile.id);

        if (staffIds.length === 0) {
            return { created_shifts: 0, created_assignments: 0, warnings: ['Sin personal activo'] };
        }

        const { data: staffRules } = await supabase
            .from('staff_schedule_rules')
            .select('staff_id, allowed_shift_codes, max_consecutive_days')
            .eq('organization_id', month.organization_id);

        const { data: timeOffData } = await supabase
            .from('staff_time_off')
            .select('staff_id, start_date, end_date')
            .eq('status', 'APPROVED')
            .in('staff_id', staffIds)
            .gte('end_date', rangeStart)
            .lte('start_date', rangeEnd);

        const staffRulesById = new Map(
            (staffRules || []).map((rule: StaffRule) => [rule.staff_id, rule])
        );
        const timeOffByStaff = this.groupTimeOff(timeOffData || []);

        const { data: shiftsInRange } = await supabase
            .from('shifts')
            .select(
                `
                id,
                date,
                shift_code,
                station,
                start_time,
                end_time,
                assignments:shift_assignments (
                    id,
                    staff_id,
                    locked
                )
            `
            )
            .eq('schedule_month_id', monthId)
            .gte('date', rangeStart)
            .lte('date', rangeEnd);

        const shifts = shiftsInRange || [];
        const shiftIds = shifts.map((shift: any) => shift.id);

        if (shiftIds.length > 0) {
            await supabase.from('shift_assignments').delete().in('shift_id', shiftIds).eq('locked', false);
        }

        const shiftsToDelete = shifts
            .filter((shift: any) => !(shift.assignments || []).some((assignment: any) => assignment.locked))
            .map((shift: any) => shift.id);

        if (shiftsToDelete.length > 0) {
            await supabase.from('shifts').delete().in('id', shiftsToDelete);
        }

        const keptShifts = shifts.filter(
            (shift: any) => (shift.assignments || []).some((assignment: any) => assignment.locked)
        );
        const existingShiftMap = new Map<string, any>();
        const lockedAssignmentsByShift = new Map<string, Set<string>>();

        keptShifts.forEach((shift: any) => {
            const key = this.shiftKey(shift.date, shift.shift_code, shift.station);
            existingShiftMap.set(key, shift);
            const locked = new Set(
                (shift.assignments || [])
                    .filter((assignment: any) => assignment.locked)
                    .map((assignment: any) => assignment.staff_id)
            );
            lockedAssignmentsByShift.set(shift.id, locked as Set<string>);
        });

        const staffAssignedDates = new Map<string, Set<string>>();
        const staffAssignmentCounts = new Map<string, number>();
        const staffAssignments = new Map<string, Set<string>>();
        const staffShiftByDate = new Map<string, string>();
        const weekendOffByStaff = this.assignWeekendOff({
            staffIds,
            timeOffByStaff,
            lockedAssignmentsByShift,
            existingShiftMap,
            rangeStart,
            rangeEnd,
        });

        staffIds.forEach((staffId) => {
            staffAssignedDates.set(staffId, new Set());
            staffAssignmentCounts.set(staffId, 0);
            staffAssignments.set(staffId, new Set());
        });

        for (const shift of keptShifts) {
            const locked = lockedAssignmentsByShift.get(shift.id) || new Set<string>();
            locked.forEach((staffId) => {
                staffAssignedDates.get(staffId)?.add(shift.date);
                staffAssignments.get(staffId)?.add(shift.date);
                staffShiftByDate.set(`${staffId}|${shift.date}`, shift.shift_code);
                staffAssignmentCounts.set(staffId, (staffAssignmentCounts.get(staffId) || 0) + 1);
            });
        }

        let createdShifts = 0;
        let createdAssignments = 0;
        const warnings: string[] = [];

        const dates = this.enumerateDates(rangeStart, rangeEnd);
        for (const date of dates) {
            const rulesForDate = this.resolveCoverageForDate(date, effectiveDayRules, overrides);
            for (const rule of rulesForDate) {
                if (!rule.required_staff || rule.required_staff <= 0) {
                    continue;
                }

                const key = this.shiftKey(date, rule.shift_code, rule.station);
                let shift = existingShiftMap.get(key);

                if (!shift) {
                    const template = templateMap.get(rule.shift_code);
                    const times = template || this.defaultShiftTimes(rule.shift_code);

                    const { data: created, error: createError } = await supabase
                        .from('shifts')
                        .insert({
                            organization_id: month.organization_id,
                            schedule_month_id: monthId,
                            date,
                            start_time: times.start_time,
                            end_time: times.end_time,
                            shift_code: rule.shift_code,
                            station: rule.station || null,
                            template_id: template?.id || null,
                            status: 'DRAFT',
                        })
                        .select()
                        .single();

                    if (createError) {
                        logger.error(createError, 'Error creating shift in generator');
                        warnings.push(`No se pudo crear turno ${rule.shift_code} ${date}`);
                        continue;
                    }

                    shift = created;
                    existingShiftMap.set(key, shift);
                    createdShifts += 1;
                }

                const locked = lockedAssignmentsByShift.get(shift.id) || new Set<string>();
                let alreadyAssigned = locked.size;
                const remaining = rule.required_staff - alreadyAssigned;

                if (remaining <= 0) {
                    continue;
                }

                const availableStaff = staffIds.filter((staffId) => {
                    if (locked.has(staffId)) return false;
                    if (this.isStaffOff(staffId, date, timeOffByStaff)) return false;
                    if (this.isWeekendOffBlocked(staffId, date, weekendOffByStaff)) return false;
                    if (staffAssignedDates.get(staffId)?.has(date)) return false;
                    if (!this.isShiftAllowed(staffId, rule.shift_code, staffRulesById)) return false;
                    if (this.hasRestConflict(staffId, date, rule.shift_code, staffShiftByDate)) return false;
                    if (!this.canAssignConsecutive(staffId, date, staffRulesById, staffAssignments)) return false;
                    return true;
                });

                availableStaff.sort((a, b) => {
                    const countA = staffAssignmentCounts.get(a) || 0;
                    const countB = staffAssignmentCounts.get(b) || 0;
                    return countA - countB;
                });

                let selected = availableStaff.slice(0, remaining);
                if (selected.length < remaining) {
                    const relaxed = staffIds.filter((staffId) => {
                        if (locked.has(staffId)) return false;
                        if (this.isStaffOff(staffId, date, timeOffByStaff)) return false;
                        if (staffAssignedDates.get(staffId)?.has(date)) return false;
                        if (!this.isShiftAllowed(staffId, rule.shift_code, staffRulesById)) return false;
                        return true;
                    });
                    relaxed.sort((a, b) => {
                        const countA = staffAssignmentCounts.get(a) || 0;
                        const countB = staffAssignmentCounts.get(b) || 0;
                        return countA - countB;
                    });
                    const needed = remaining - selected.length;
                    const extra = relaxed.filter((id) => !selected.includes(id)).slice(0, needed);
                    if (extra.length > 0) {
                        warnings.push(
                            `Relaxed rules for ${date} ${rule.shift_code} (${extra.length} asignaciones)`
                        );
                        selected = selected.concat(extra);
                    }
                }
                if (selected.length < remaining) {
                    warnings.push(
                        `Cobertura incompleta ${date} ${rule.shift_code}: ${selected.length}/${remaining}`
                    );
                }

                if (selected.length === 0) {
                    continue;
                }

                const assignments = selected.map((staffId) => ({
                    shift_id: shift.id,
                    staff_id: staffId,
                    status: 'ASSIGNED',
                    locked: false,
                }));

                const { error: assignmentError } = await supabase
                    .from('shift_assignments')
                    .insert(assignments);

                if (assignmentError) {
                    logger.error(assignmentError, 'Error creating shift assignments');
                    warnings.push(`Error asignando personal ${date} ${rule.shift_code}`);
                    continue;
                }

                selected.forEach((staffId) => {
                    staffAssignedDates.get(staffId)?.add(date);
                    staffAssignments.get(staffId)?.add(date);
                    staffShiftByDate.set(`${staffId}|${date}`, rule.shift_code);
                    staffAssignmentCounts.set(staffId, (staffAssignmentCounts.get(staffId) || 0) + 1);
                });
                createdAssignments += selected.length;
            }
        }

        return { created_shifts: createdShifts, created_assignments: createdAssignments, warnings };
    }

    private resolveCoverageForDate(date: string, dayRules: CoverageRule[], overrides: CoverageOverride[]) {
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        const dayRuleMap = new Map<string, CoverageRule>();
        dayRules
            .filter((rule) => rule.weekday === weekday)
            .forEach((rule) => {
                dayRuleMap.set(this.coverageKey(rule.shift_code, rule.station), rule);
            });

        const overridesForDate = overrides.filter((rule) => rule.date === date);
        overridesForDate.forEach((override) => {
            dayRuleMap.set(this.coverageKey(override.shift_code, override.station), override as any);
        });

        return Array.from(dayRuleMap.values());
    }

    private coverageKey(shiftCode: string, station?: string | null) {
        return `${shiftCode}|${station || ''}`;
    }

    private shiftKey(date: string, shiftCode: string, station?: string | null) {
        return `${date}|${shiftCode}|${station || ''}`;
    }

    private defaultShiftTimes(shiftCode: string) {
        if (shiftCode === 'MORNING') {
            return { start_time: '06:00', end_time: '14:00', id: null };
        }
        if (shiftCode === 'AFTERNOON') {
            return { start_time: '16:00', end_time: '00:00', id: null };
        }
        if (shiftCode === 'NIGHT') {
            return { start_time: '23:00', end_time: '07:00', id: null };
        }
        return { start_time: '08:00', end_time: '16:00', id: null };
    }

    private async loadShiftTemplates(organizationId: string) {
        const { data } = await supabase
            .from('shift_templates')
            .select('id, shift_code, start_time, end_time')
            .eq('organization_id', organizationId);

        const map = new Map<string, { id: string; shift_code: string; start_time: string; end_time: string }>();
        (data || []).forEach((template: any) => {
            map.set(template.shift_code, template);
        });
        return map;
    }

    private groupTimeOff(timeOff: StaffTimeOff[]) {
        const map = new Map<string, StaffTimeOff[]>();
        timeOff.forEach((entry) => {
            if (!map.has(entry.staff_id)) {
                map.set(entry.staff_id, []);
            }
            map.get(entry.staff_id)!.push(entry);
        });
        return map;
    }

    private isStaffOff(staffId: string, date: string, timeOffByStaff: Map<string, StaffTimeOff[]>) {
        const entries = timeOffByStaff.get(staffId) || [];
        return entries.some((entry) => entry.start_date <= date && entry.end_date >= date);
    }

    private isShiftAllowed(staffId: string, shiftCode: string, rulesByStaff: Map<string, StaffRule>) {
        const rule = rulesByStaff.get(staffId);
        if (!rule || !rule.allowed_shift_codes || rule.allowed_shift_codes.length === 0) {
            return true;
        }
        return rule.allowed_shift_codes.includes(shiftCode);
    }

    private canAssignConsecutive(
        staffId: string,
        date: string,
        rulesByStaff: Map<string, StaffRule>,
        assignmentsByStaff: Map<string, Set<string>>
    ) {
        const rule = rulesByStaff.get(staffId);
        if (!rule?.max_consecutive_days) {
            return true;
        }

        const assigned = assignmentsByStaff.get(staffId);
        if (!assigned || assigned.size === 0) {
            return true;
        }

        const dates = Array.from(assigned.values()).concat(date).sort();
        let streak = 1;
        let maxStreak = 1;
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

        return maxStreak <= rule.max_consecutive_days;
    }

    private defaultCoverageRules(): CoverageRule[] {
        const rules: CoverageRule[] = [];
        for (let weekday = 0; weekday < 7; weekday += 1) {
            const isFriday = weekday === 5;
            const isSaturday = weekday === 6;
            rules.push({
                weekday,
                shift_code: 'MORNING',
                required_staff: isFriday || isSaturday ? 2 : 1,
            });
            rules.push({
                weekday,
                shift_code: 'AFTERNOON',
                required_staff: 1,
            });
        }
        return rules;
    }

    private assignWeekendOff(params: {
        staffIds: string[];
        timeOffByStaff: Map<string, StaffTimeOff[]>;
        lockedAssignmentsByShift: Map<string, Set<string>>;
        existingShiftMap: Map<string, any>;
        rangeStart: string;
        rangeEnd: string;
    }) {
        const { staffIds, timeOffByStaff, lockedAssignmentsByShift, existingShiftMap, rangeStart, rangeEnd } = params;
        const blocked = new Map<string, Set<string>>();
        staffIds.forEach((staffId) => blocked.set(staffId, new Set()));

        const dates = this.enumerateDates(rangeStart, rangeEnd);
        const weekends: Array<{ saturday: string; sunday: string }> = [];
        for (const date of dates) {
            const day = new Date(`${date}T00:00:00Z`).getUTCDay();
            if (day === 6) {
                const sunday = this.addDays(date, 1);
                if (sunday <= rangeEnd) {
                    weekends.push({ saturday: date, sunday });
                }
            }
        }

        staffIds.forEach((staffId) => {
            const entries = timeOffByStaff.get(staffId) || [];
            const hasWeekendOff = weekends.some(
                (pair) =>
                    entries.some(
                        (entry) =>
                            entry.start_date <= pair.saturday &&
                            entry.end_date >= pair.sunday &&
                            entry.start_date <= pair.sunday
                    )
            );
            if (hasWeekendOff) {
                return;
            }

            for (const pair of weekends) {
                if (this.isStaffOff(staffId, pair.saturday, timeOffByStaff)) {
                    continue;
                }
                if (this.isStaffOff(staffId, pair.sunday, timeOffByStaff)) {
                    continue;
                }
                if (this.hasLockedAssignment(staffId, pair.saturday, existingShiftMap, lockedAssignmentsByShift)) {
                    continue;
                }
                if (this.hasLockedAssignment(staffId, pair.sunday, existingShiftMap, lockedAssignmentsByShift)) {
                    continue;
                }

                blocked.get(staffId)?.add(pair.saturday);
                blocked.get(staffId)?.add(pair.sunday);
                break;
            }
        });

        return blocked;
    }

    private isWeekendOffBlocked(staffId: string, date: string, blocked: Map<string, Set<string>>) {
        return blocked.get(staffId)?.has(date) ?? false;
    }

    private hasRestConflict(
        staffId: string,
        date: string,
        shiftCode: string,
        staffShiftByDate: Map<string, string>
    ) {
        if (shiftCode !== 'MORNING') {
            return false;
        }
        const previousDate = this.addDays(date, -1);
        const previousShift = staffShiftByDate.get(`${staffId}|${previousDate}`);
        return previousShift === 'AFTERNOON';
    }

    private hasLockedAssignment(
        staffId: string,
        date: string,
        shiftMap: Map<string, any>,
        lockedAssignmentsByShift: Map<string, Set<string>>
    ) {
        for (const shiftCode of ['MORNING', 'AFTERNOON']) {
            const key = this.shiftKey(date, shiftCode);
            const shift = shiftMap.get(key);
            if (shift) {
                const locked = lockedAssignmentsByShift.get(shift.id);
                if (locked?.has(staffId)) {
                    return true;
                }
            }
        }
        return false;
    }

    private addDays(date: string, amount: number) {
        const base = new Date(`${date}T00:00:00Z`);
        base.setUTCDate(base.getUTCDate() + amount);
        return base.toISOString().slice(0, 10);
    }

    private enumerateDates(start: string, end: string) {
        const dates: string[] = [];
        const current = new Date(`${start}T00:00:00Z`);
        const last = new Date(`${end}T00:00:00Z`);
        for (; current <= last; current.setUTCDate(current.getUTCDate() + 1)) {
            dates.push(current.toISOString().slice(0, 10));
        }
        return dates;
    }

    private normalizeDate(value: string) {
        return value.length === 7 ? `${value}-01` : value;
    }

    private endOfMonth(month: string) {
        const base = new Date(`${month}T00:00:00Z`);
        const year = base.getUTCFullYear();
        const monthIndex = base.getUTCMonth();
        const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
        return lastDay.toISOString().slice(0, 10);
    }
}
