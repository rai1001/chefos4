import { supabase } from '@/config/supabase';

export class InventoryAlertsService {
    async listAlerts(params: { organizationIds: string[]; status?: 'OPEN' | 'RESOLVED' }) {
        const { organizationIds, status } = params;
        let query = supabase.from('inventory_alerts').select('*').in('organization_id', organizationIds);

        if (status === 'OPEN') {
            query = query.is('resolved_at', null);
        }
        if (status === 'RESOLVED') {
            query = query.not('resolved_at', 'is', null);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async resolveAlert(params: { id: string; organizationIds: string[]; userId?: string }) {
        const { id, organizationIds, userId } = params;
        const { data, error } = await supabase
            .from('inventory_alerts')
            .update({ resolved_at: new Date().toISOString(), resolved_by: userId ?? null })
            .eq('id', id)
            .in('organization_id', organizationIds)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}
