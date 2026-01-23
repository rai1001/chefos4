-- =====================================================
-- Sprint 19: Schedule coverage rules + locked assignments
-- Fecha: 2026-01-28
-- =====================================================

CREATE TABLE IF NOT EXISTS public.schedule_day_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    shift_code TEXT NOT NULL CHECK (shift_code IN ('MORNING', 'AFTERNOON', 'NIGHT')),
    required_staff INTEGER NOT NULL DEFAULT 0,
    station TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS schedule_day_requirements_unique
    ON public.schedule_day_requirements (organization_id, weekday, shift_code, station);

CREATE TABLE IF NOT EXISTS public.schedule_date_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_code TEXT NOT NULL CHECK (shift_code IN ('MORNING', 'AFTERNOON', 'NIGHT')),
    required_staff INTEGER NOT NULL DEFAULT 0,
    station TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schedule_date_overrides_org_date_idx
    ON public.schedule_date_overrides (organization_id, date);

ALTER TABLE public.shift_assignments
    ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS locked_reason TEXT;

ALTER TABLE public.schedule_day_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_date_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization isolation for schedule_day_requirements" ON public.schedule_day_requirements
    FOR ALL USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Organization isolation for schedule_date_overrides" ON public.schedule_date_overrides
    FOR ALL USING (organization_id IN (SELECT public.user_organization_ids()));
