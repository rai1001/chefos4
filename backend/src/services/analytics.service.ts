import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export class AnalyticsService {
    async getInventoryValuation(organizationId: string) {
        const { data, error } = await supabase
            .from('v_inventory_valuation')
            .select('*')
            .eq('organization_id', organizationId);

        if (error) throw error;
        return data;
    }

    async getConsumptionTrends(organizationId: string) {
        const { data, error } = await supabase
            .from('v_consumption_stats')
            .select('*')
            .eq('organization_id', organizationId)
            .order('day', { ascending: true });

        if (error) throw error;
        return data;
    }

    async getFoodCostMetrics(organizationId: string) {
        const { data, error } = await supabase
            .from('v_food_cost_metrics')
            .select('*')
            .eq('organization_id', organizationId)
            .order('event_date', { ascending: false })
            .limit(5);

        if (error) throw error;
        return data;
    }

    async getGlobalKPIs(organizationId: string) {
        // Valuation Summary
        const { data: valuation } = await supabase
            .from('v_inventory_valuation')
            .select('total_value')
            .eq('organization_id', organizationId);

        const totalValuation = valuation?.reduce((acc, curr) => acc + Number(curr.total_value), 0) || 0;

        // Count of low stock items
        const { count: lowStockCount } = await supabase
            .from('ingredients')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .is('deleted_at', null)
            .filter('stock_current', 'lte', 'stock_min');

        // Pending Purchase Orders
        const { count: pendingPOs } = await supabase
            .from('purchase_orders')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .in('status', ['DRAFT', 'SENT']);

        return {
            total_valuation: totalValuation,
            low_stock_count: lowStockCount || 0,
            pending_pos: pendingPOs || 0,
            active_events: 0, // Placeholder
        };
    }
}
