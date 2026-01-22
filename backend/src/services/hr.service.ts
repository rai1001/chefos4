
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';
import crypto from 'crypto';

export class HRService {
    async createInvitation(email: string, role: string, organizationId: string, createdBy: string) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const { data, error } = await supabase
            .from('user_invitations')
            .insert({
                email,
                role,
                organization_id: organizationId,
                token,
                expires_at: expiresAt.toISOString(),
                created_by: createdBy
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error creating invitation');
            throw new AppError(500, 'Failed to create invitation');
        }

        return data;
    }

    async getEmployees(organizationId: string) {
        const { data, error } = await supabase
            .from('organization_members')
            .select('role, user:users (id, name, email)')
            .eq('organization_id', organizationId)
            .is('user.deleted_at', null);

        if (error) {
            logger.error(error, 'Error fetching employees');
            throw new AppError(500, 'Failed to fetch employees');
        }

        return data;
    }

    async upsertSchedule(organizationId: string, scheduleData: any) {
        const { data, error } = await supabase
            .from('employee_schedules')
            .upsert({
                ...scheduleData,
                organization_id: organizationId,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error upserting schedule');
            throw new AppError(500, 'Failed to save schedule');
        }

        return data;
    }

    async getSchedules(organizationId: string, startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('employee_schedules')
            .select('*, user:users (id, name)')
            .eq('organization_id', organizationId)
            .gte('shift_start', startDate)
            .lte('shift_end', endDate);

        if (error) {
            logger.error(error, 'Error fetching schedules');
            throw new AppError(500, 'Failed to fetch schedules');
        }

        return data;
    }
}
