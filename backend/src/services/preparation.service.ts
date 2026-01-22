import { supabase } from '@/config/supabase';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export class PreparationService {
    async list(organizationIds: string[]) {
        const { data, error } = await supabase
            .from('preparations')
            .select('*, unit:units (id, name, abbreviation)')
            .in('organization_id', organizationIds)
            .order('name');

        if (error) {
            logger.error(error, 'Error listing preparations');
            throw new AppError(500, 'Failed to fetch preparations');
        }

        return data || [];
    }

    async create(params: {
        organizationId: string;
        name: string;
        unitId: string;
        defaultShelfLifeDays?: number | null;
        station?: string | null;
        notes?: string | null;
        active?: boolean;
    }) {
        const { data, error } = await supabase
            .from('preparations')
            .insert({
                organization_id: params.organizationId,
                name: params.name,
                unit_id: params.unitId,
                default_shelf_life_days: params.defaultShelfLifeDays ?? 0,
                station: params.station || null,
                notes: params.notes || null,
                active: params.active ?? true,
            })
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error creating preparation');
            throw new AppError(500, 'Failed to create preparation');
        }

        return data;
    }

    async update(params: {
        id: string;
        organizationIds: string[];
        name?: string;
        unitId?: string;
        defaultShelfLifeDays?: number | null;
        station?: string | null;
        notes?: string | null;
        active?: boolean;
    }) {
        const { data: existing, error: existingError } = await supabase
            .from('preparations')
            .select('id')
            .eq('id', params.id)
            .in('organization_id', params.organizationIds)
            .single();

        if (existingError || !existing) {
            throw new AppError(404, 'Preparation not found');
        }

        const { data, error } = await supabase
            .from('preparations')
            .update({
                name: params.name ?? undefined,
                unit_id: params.unitId ?? undefined,
                default_shelf_life_days: params.defaultShelfLifeDays ?? undefined,
                station: params.station ?? undefined,
                notes: params.notes ?? undefined,
                active: params.active ?? undefined,
            })
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            logger.error(error, 'Error updating preparation');
            throw new AppError(500, 'Failed to update preparation');
        }

        return data;
    }
}
