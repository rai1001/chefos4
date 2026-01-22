-- =====================================================
-- Sprint 20: Inventory cycle counts + alerts
-- Fecha: 2026-01-26
-- =====================================================

-- Cycle counts (cabecera)
CREATE TABLE IF NOT EXISTS public.cycle_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_id UUID NULL REFERENCES public.storage_locations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS cycle_counts_org_idx ON public.cycle_counts (organization_id);
CREATE INDEX IF NOT EXISTS cycle_counts_status_idx ON public.cycle_counts (status);
CREATE INDEX IF NOT EXISTS cycle_counts_location_idx ON public.cycle_counts (location_id);

-- Cycle count items (lineas)
CREATE TABLE IF NOT EXISTS public.cycle_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_count_id UUID NOT NULL REFERENCES public.cycle_counts(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    batch_id UUID NULL REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    expected_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
    counted_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
    unit_id UUID NULL REFERENCES public.units(id),
    variance_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cycle_count_items_cycle_idx ON public.cycle_count_items (cycle_count_id);
CREATE INDEX IF NOT EXISTS cycle_count_items_ingredient_idx ON public.cycle_count_items (ingredient_id);
CREATE INDEX IF NOT EXISTS cycle_count_items_batch_idx ON public.cycle_count_items (batch_id);

-- Inventory alerts
CREATE TABLE IF NOT EXISTS public.inventory_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('EXPIRING_SOON', 'EXPIRED', 'LOW_STOCK')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('BATCH', 'INGREDIENT', 'PREPARATION_BATCH')),
    entity_id UUID NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS inventory_alerts_org_idx ON public.inventory_alerts (organization_id);
CREATE INDEX IF NOT EXISTS inventory_alerts_type_idx ON public.inventory_alerts (type);
CREATE INDEX IF NOT EXISTS inventory_alerts_created_idx ON public.inventory_alerts (created_at);
CREATE INDEX IF NOT EXISTS inventory_alerts_resolved_idx ON public.inventory_alerts (resolved_at);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.cycle_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization isolation for cycle_counts" ON public.cycle_counts;
CREATE POLICY "Organization isolation for cycle_counts" ON public.cycle_counts
    FOR ALL USING (organization_id IN (SELECT public.user_organization_ids()));

DROP POLICY IF EXISTS "Organization isolation for cycle_count_items" ON public.cycle_count_items;
CREATE POLICY "Organization isolation for cycle_count_items" ON public.cycle_count_items
    FOR ALL USING (
        cycle_count_id IN (
            SELECT id FROM public.cycle_counts
            WHERE organization_id IN (SELECT public.user_organization_ids())
        )
    );

DROP POLICY IF EXISTS "Organization isolation for inventory_alerts" ON public.inventory_alerts;
CREATE POLICY "Organization isolation for inventory_alerts" ON public.inventory_alerts
    FOR ALL USING (organization_id IN (SELECT public.user_organization_ids()));
