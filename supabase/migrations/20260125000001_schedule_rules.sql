-- =====================================================
-- Sprint 18: Schedule Rules & Rotations
-- Fecha: 2026-01-25
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_schedule_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  allowed_shift_codes TEXT[] DEFAULT ARRAY['MORNING','AFTERNOON','NIGHT'],
  rotation_mode TEXT NOT NULL DEFAULT 'NONE' CHECK (rotation_mode IN ('NONE','WEEKLY','BIWEEKLY','MONTHLY')),
  preferred_days_off TEXT[] DEFAULT ARRAY[]::TEXT[],
  max_consecutive_days INTEGER NULL,
  requires_weekend_off_per_month BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_schedule_rules_unique
  ON staff_schedule_rules (organization_id, staff_id);

CREATE TABLE IF NOT EXISTS organization_schedule_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  weekend_definition TEXT NOT NULL DEFAULT 'SAT_SUN' CHECK (weekend_definition IN ('SAT_SUN','FRI_SAT','CUSTOM')),
  enforce_weekend_off_hard BOOLEAN DEFAULT true,
  rotation_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_schedule_rules_unique
  ON organization_schedule_rules (organization_id);

ALTER TABLE staff_schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_schedule_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization isolation for staff_schedule_rules" ON staff_schedule_rules FOR ALL
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Organization isolation for organization_schedule_rules" ON organization_schedule_rules FOR ALL
  USING (organization_id IN (SELECT public.user_organization_ids()));
