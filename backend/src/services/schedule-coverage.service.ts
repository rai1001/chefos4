import { supabase } from '@/config/supabase';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export interface CoverageRuleInput {
    weekday: number;
    shift_code: string;
    required_staff: number;
    station?: string | null;
    active?: boolean;
}

export interface CoverageOverrideInput {
    date: string;
    shift_code: string;
    required_staff: number;
    station?: string | null;
    reason?: string | null;
}

export class ScheduleCoverageService {
    async getCoverageRules(params: { organizationId: string; from?: string; to?: string }) {
        const { organizationId, from, to } = params;

        const { data: dayRules, error: dayError } = await supabase
            .from('schedule_day_requirements')
            .select('*')
            .eq('organization_id', organizationId)
            .order('weekday', { ascending: true })
            .order('shift_code', { ascending: true });

        if (dayError) {
            logger.error(dayError, 'Error fetching schedule day requirements');
            throw new AppError(500, 'Failed to fetch coverage rules');
        }

        let overridesQuery = supabase
            .from('schedule_date_overrides')
            .select('*')
            .eq('organization_id', organizationId)
            .order('date', { ascending: true });

        if (from) {
            overridesQuery = overridesQuery.gte('date', from);
        }
        if (to) {
            overridesQuery = overridesQuery.lte('date', to);
        }

        const { data: overrides, error: overrideError } = await overridesQuery;

        if (overrideError) {
            logger.error(overrideError, 'Error fetching coverage overrides');
            throw new AppError(500, 'Failed to fetch coverage overrides');
        }

        return { day_rules: dayRules || [], date_overrides: overrides || [] };
    }

    async updateCoverageRules(params: { organizationId: string; rules: CoverageRuleInput[] }) {
        const { organizationId, rules } = params;

        const { error: deleteError } = await supabase
            .from('schedule_day_requirements')
            .delete()
            .eq('organization_id', organizationId);

        if (deleteError) {
            logger.error(deleteError, 'Error clearing coverage rules');
            throw new AppError(500, 'Failed to update coverage rules');
        }

        if (rules.length === 0) {
            return [];
        }

        const inserts = rules.map((rule) => ({
            organization_id: organizationId,
            weekday: rule.weekday,
            shift_code: rule.shift_code,
            required_staff: Math.max(0, rule.required_staff),
            station: rule.station ?? null,
            active: rule.active ?? true,
        }));

        const { data, error } = await supabase
            .from('schedule_day_requirements')
            .insert(inserts)
            .select();

        if (error) {
            logger.error(error, 'Error inserting coverage rules');
            throw new AppError(500, 'Failed to update coverage rules');
        }

        return data;
    }

    async createOverride(params: { organizationId: string; override: CoverageOverrideInput }) {
        const { organizationId, override } = params;

        const { data, error } = await supabase
            .from('schedule_date_overrides')
            .insert({
                organization_id: organizationId,
                date: override.date,
                shift_code: override.shift_code,
                required_staff: Math.max(0, override.required_staff),
                station: override.station ?? null,
                reason: override.reason ?? null,
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error creating coverage override');
            throw new AppError(500, 'Failed to create coverage override');
        }

        return data;
    }
}
