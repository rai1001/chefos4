import { supabase } from '@/config/supabase';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export class StaffService {
    async listStaff(organizationIds: string[]) {
        const { data, error } = await supabase
            .from('staff_profiles')
            .select(
                `
                *,
                member:organization_members (
                    id,
                    role,
                    user:users (id, name, email)
                ),
                contract:staff_contracts (
                    id,
                    weekly_hours_target,
                    max_weekly_hours,
                    vacation_days_per_year,
                    rest_min_hours_between_shifts
                ),
                vacation_balance:staff_vacation_balance (
                    year,
                    days_allocated,
                    days_used,
                    days_remaining
                )
            `
            )
            .in('organization_id', organizationIds)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error(error, 'Error fetching staff profiles');
            throw new AppError(500, 'Failed to fetch staff profiles');
        }

        return data || [];
    }

    async createStaff(params: {
        organizationId: string;
        memberId?: string | null;
        displayName?: string | null;
        contactEmail?: string | null;
        staffType?: string | null;
        roleInKitchen?: string | null;
        skills?: any[] | null;
        active?: boolean;
        contract?: {
            weekly_hours_target?: number | null;
            max_weekly_hours?: number | null;
            vacation_days_per_year?: number | null;
            rest_min_hours_between_shifts?: number | null;
        };
    }) {
        const {
            organizationId,
            memberId,
            displayName,
            contactEmail,
            staffType,
            roleInKitchen,
            skills,
            active,
            contract
        } = params;

        const { data: staff, error } = await supabase
            .from('staff_profiles')
            .insert({
                organization_id: organizationId,
                member_id: memberId || null,
                display_name: displayName || null,
                contact_email: contactEmail || null,
                staff_type: staffType || 'INTERNAL',
                role_in_kitchen: roleInKitchen || null,
                skills: skills || [],
                active: active ?? true,
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error creating staff profile');
            throw new AppError(500, 'Failed to create staff profile');
        }

        if (contract) {
            await this.upsertContract(staff.id, contract);
        }

        return staff;
    }

    async updateStaff(params: {
        id: string;
        organizationIds: string[];
        roleInKitchen?: string | null;
        skills?: any[] | null;
        active?: boolean;
        contract?: {
            weekly_hours_target?: number | null;
            max_weekly_hours?: number | null;
            vacation_days_per_year?: number | null;
            rest_min_hours_between_shifts?: number | null;
        };
    }) {
        const { id, organizationIds, roleInKitchen, skills, active, contract } = params;

        const { data: existing, error: existingError } = await supabase
            .from('staff_profiles')
            .select('id')
            .eq('id', id)
            .in('organization_id', organizationIds)
            .single();

        if (existingError || !existing) {
            throw new AppError(404, 'Staff profile not found');
        }

        const { data, error } = await supabase
            .from('staff_profiles')
            .update({
                role_in_kitchen: roleInKitchen ?? undefined,
                skills: skills ?? undefined,
                active: active ?? undefined,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error updating staff profile');
            throw new AppError(500, 'Failed to update staff profile');
        }

        if (contract) {
            await this.upsertContract(id, contract);
        }

        return data;
    }

    async getVacationBalance(params: { staffId: string; year: number; organizationIds: string[] }) {
        const { staffId, year, organizationIds } = params;

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
            .from('staff_vacation_balance')
            .select('*')
            .eq('staff_id', staffId)
            .eq('year', year)
            .maybeSingle();

        if (error) {
            logger.error(error, 'Error fetching vacation balance');
            throw new AppError(500, 'Failed to fetch vacation balance');
        }

        return data;
    }

    private async upsertContract(
        staffId: string,
        contract: {
            weekly_hours_target?: number | null;
            max_weekly_hours?: number | null;
            vacation_days_per_year?: number | null;
            rest_min_hours_between_shifts?: number | null;
        }
    ) {
        const { error } = await supabase
            .from('staff_contracts')
            .upsert({
                staff_id: staffId,
                weekly_hours_target: contract.weekly_hours_target ?? null,
                max_weekly_hours: contract.max_weekly_hours ?? null,
                vacation_days_per_year: contract.vacation_days_per_year ?? null,
                rest_min_hours_between_shifts: contract.rest_min_hours_between_shifts ?? null,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error upserting staff contract');
            throw new AppError(500, 'Failed to update staff contract');
        }
    }
}
