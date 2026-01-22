import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

type AlertType = 'EXPIRING_SOON' | 'EXPIRED' | 'LOW_STOCK';
type EntityType = 'BATCH' | 'INGREDIENT' | 'PREPARATION_BATCH';

type AlertCandidate = {
    entityId: string;
    entityType: EntityType;
    type: AlertType;
    severity: 'INFO' | 'WARN' | 'CRITICAL';
};

export class InventoryAlertsJobService {
    private expiringDays: number;

    constructor(expiringDays?: number) {
        const configured = expiringDays ?? Number(process.env.ALERTS_EXPIRING_DAYS || 7);
        this.expiringDays = Number.isFinite(configured) && configured > 0 ? configured : 7;
    }

    async runForOrganizations(organizationIds: string[]) {
        const results = [];
        for (const organizationId of organizationIds) {
            const created = await this.runForOrganization(organizationId);
            results.push({ organization_id: organizationId, created });
        }
        return results;
    }

    async runForOrganization(organizationId: string) {
        const today = new Date();
        const todayIso = today.toISOString().slice(0, 10);
        const expiringDate = new Date(today);
        expiringDate.setDate(expiringDate.getDate() + this.expiringDays);
        const expiringIso = expiringDate.toISOString().slice(0, 10);

        const candidates: AlertCandidate[] = [];

        const { data: expiringBatches, error: expiringError } = await supabase
            .from('inventory_batches')
            .select('id')
            .eq('organization_id', organizationId)
            .gte('expiry_date', todayIso)
            .lte('expiry_date', expiringIso);
        if (expiringError) throw expiringError;

        for (const batch of expiringBatches || []) {
            candidates.push({
                entityId: batch.id,
                entityType: 'BATCH',
                type: 'EXPIRING_SOON',
                severity: 'WARN',
            });
        }

        const { data: expiredBatches, error: expiredError } = await supabase
            .from('inventory_batches')
            .select('id')
            .eq('organization_id', organizationId)
            .lt('expiry_date', todayIso);
        if (expiredError) throw expiredError;

        for (const batch of expiredBatches || []) {
            candidates.push({
                entityId: batch.id,
                entityType: 'BATCH',
                type: 'EXPIRED',
                severity: 'CRITICAL',
            });
        }

        const { data: expiringPrep, error: prepExpError } = await supabase
            .from('preparation_batches')
            .select('id')
            .eq('organization_id', organizationId)
            .gte('expiry_date', todayIso)
            .lte('expiry_date', expiringIso);
        if (prepExpError) throw prepExpError;

        for (const batch of expiringPrep || []) {
            candidates.push({
                entityId: batch.id,
                entityType: 'PREPARATION_BATCH',
                type: 'EXPIRING_SOON',
                severity: 'WARN',
            });
        }

        const { data: expiredPrep, error: prepExpiredError } = await supabase
            .from('preparation_batches')
            .select('id')
            .eq('organization_id', organizationId)
            .lt('expiry_date', todayIso);
        if (prepExpiredError) throw prepExpiredError;

        for (const batch of expiredPrep || []) {
            candidates.push({
                entityId: batch.id,
                entityType: 'PREPARATION_BATCH',
                type: 'EXPIRED',
                severity: 'CRITICAL',
            });
        }

        const { data: ingredients, error: ingredientError } = await supabase
            .from('ingredients')
            .select('id, stock_current, stock_min')
            .eq('organization_id', organizationId)
            .is('deleted_at', null);
        if (ingredientError) throw ingredientError;

        for (const ingredient of ingredients || []) {
            if (Number(ingredient.stock_current) <= Number(ingredient.stock_min)) {
                candidates.push({
                    entityId: ingredient.id,
                    entityType: 'INGREDIENT',
                    type: 'LOW_STOCK',
                    severity: 'WARN',
                });
            }
        }

        const createdCount = await this.insertMissingAlerts(organizationId, candidates);
        logger.info({ organizationId, createdCount }, 'Inventory alerts job completed');
        return createdCount;
    }

    private async insertMissingAlerts(organizationId: string, candidates: AlertCandidate[]) {
        if (candidates.length === 0) {
            return 0;
        }

        const grouped = new Map<string, AlertCandidate[]>();
        for (const candidate of candidates) {
            const key = `${candidate.type}:${candidate.entityType}`;
            const existing = grouped.get(key) || [];
            existing.push(candidate);
            grouped.set(key, existing);
        }

        let inserted = 0;
        for (const [key, group] of grouped.entries()) {
            const [type, entityType] = key.split(':') as [AlertType, EntityType];
            const entityIds = group.map((item) => item.entityId);

            const { data: existingAlerts, error } = await supabase
                .from('inventory_alerts')
                .select('entity_id')
                .eq('organization_id', organizationId)
                .eq('type', type)
                .eq('entity_type', entityType)
                .is('resolved_at', null)
                .in('entity_id', entityIds);
            if (error) throw error;

            const existingSet = new Set((existingAlerts || []).map((row) => row.entity_id));
            const inserts = group
                .filter((item) => !existingSet.has(item.entityId))
                .map((item) => ({
                    organization_id: organizationId,
                    type: item.type,
                    entity_type: item.entityType,
                    entity_id: item.entityId,
                    severity: item.severity,
                }));

            if (inserts.length > 0) {
                const { error: insertError } = await supabase.from('inventory_alerts').insert(inserts);
                if (insertError) throw insertError;
                inserted += inserts.length;
            }
        }

        return inserted;
    }
}
