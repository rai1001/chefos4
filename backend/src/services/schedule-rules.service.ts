import { supabase } from '@/config/supabase';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export class ScheduleRulesService {
    async getStaffRules(params: { staffId: string; organizationIds: string[] }) {
        const { staffId, organizationIds } = params;
        const { data: staff, error: staffError } = await supabase
            .from('staff_profiles')
            .select('id, organization_id')
            .eq('id', staffId)
            .in('organization_id', organizationIds)
            .single();

        if (staffError || !staff) {
            throw new AppError(404, 'Staff profile not found');
        }

        const { data, error } = await supabase
            .from('staff_schedule_rules')
            .select('*')
            .eq('staff_id', staffId)
            .eq('organization_id', staff.organization_id)
            .maybeSingle();

        if (error) {
            logger.error(error, 'Error fetching staff schedule rules');
            throw new AppError(500, 'Failed to fetch staff schedule rules');
        }

        return data;
    }

    async updateStaffRules(params: {
        staffId: string;
        organizationIds: string[];
        allowedShiftCodes?: string[] | null;
        rotationMode?: string;
        preferredDaysOff?: string[] | null;
        maxConsecutiveDays?: number | null;
        requiresWeekendOff?: boolean;
    }) {
        const { staffId, organizationIds } = params;

        const { data: staff, error: staffError } = await supabase
            .from('staff_profiles')
            .select('id, organization_id')
            .eq('id', staffId)
            .in('organization_id', organizationIds)
            .single();

        if (staffError || !staff) {
            throw new AppError(404, 'Staff profile not found');
        }

        const { data, error } = await supabase
            .from('staff_schedule_rules')
            .upsert({
                organization_id: staff.organization_id,
                staff_id: staffId,
                allowed_shift_codes: params.allowedShiftCodes ?? undefined,
                rotation_mode: params.rotationMode ?? undefined,
                preferred_days_off: params.preferredDaysOff ?? undefined,
                max_consecutive_days: params.maxConsecutiveDays ?? undefined,
                requires_weekend_off_per_month: params.requiresWeekendOff ?? undefined,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error updating staff schedule rules');
            throw new AppError(500, 'Failed to update staff schedule rules');
        }

        return data;
    }

    async getOrgRules(organizationId: string) {
        const { data, error } = await supabase
            .from('organization_schedule_rules')
            .select('*')
            .eq('organization_id', organizationId)
            .maybeSingle();

        if (error) {
            logger.error(error, 'Error fetching org schedule rules');
            throw new AppError(500, 'Failed to fetch org schedule rules');
        }

        return data;
    }

    async updateOrgRules(params: {
        organizationId: string;
        weekendDefinition?: string;
        enforceWeekendOffHard?: boolean;
        rotationEnabled?: boolean;
    }) {
        const { organizationId } = params;
        const { data, error } = await supabase
            .from('organization_schedule_rules')
            .upsert({
                organization_id: organizationId,
                weekend_definition: params.weekendDefinition ?? undefined,
                enforce_weekend_off_hard: params.enforceWeekendOffHard ?? undefined,
                rotation_enabled: params.rotationEnabled ?? undefined,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error updating org schedule rules');
            throw new AppError(500, 'Failed to update org schedule rules');
        }

        return data;
    }
}
