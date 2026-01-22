-- =====================================================
-- Sprint 17: Preparations + Labels
-- Fecha: 2026-01-24
-- =====================================================

CREATE TABLE IF NOT EXISTS preparations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  default_shelf_life_days INTEGER DEFAULT 0,
  unit_id UUID NOT NULL REFERENCES units(id),
  station VARCHAR(120),
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preparations_org ON preparations(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_preparations_org_name ON preparations(organization_id, name);

CREATE TABLE IF NOT EXISTS preparation_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  preparation_id UUID NOT NULL REFERENCES preparations(id) ON DELETE CASCADE,
  produced_at DATE NOT NULL,
  quantity_produced DECIMAL(12,3) NOT NULL CHECK (quantity_produced >= 0),
  quantity_current DECIMAL(12,3) NOT NULL CHECK (quantity_current >= 0),
  expiry_date DATE NULL,
  lot_code VARCHAR(100),
  storage_location_id UUID NULL REFERENCES storage_locations(id) ON DELETE SET NULL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preparation_batches_org ON preparation_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_preparation_batches_prep ON preparation_batches(preparation_id);
CREATE INDEX IF NOT EXISTS idx_preparation_batches_expiry ON preparation_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_preparation_batches_location ON preparation_batches(storage_location_id);

CREATE TABLE IF NOT EXISTS preparation_batch_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preparation_batch_id UUID NOT NULL REFERENCES preparation_batches(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  quantity_used DECIMAL(12,3) NOT NULL CHECK (quantity_used > 0),
  movement_id UUID NULL REFERENCES stock_movements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prep_batch_ingredients_batch ON preparation_batch_ingredients(preparation_batch_id);
CREATE INDEX IF NOT EXISTS idx_prep_batch_ingredients_ingredient ON preparation_batch_ingredients(ingredient_id);

ALTER TABLE preparations ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparation_batch_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization isolation for preparations" ON preparations FOR ALL
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Organization isolation for preparation_batches" ON preparation_batches FOR ALL
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Organization isolation for preparation_batch_ingredients" ON preparation_batch_ingredients FOR ALL
  USING (
    preparation_batch_id IN (
      SELECT id FROM preparation_batches
      WHERE organization_id IN (SELECT public.user_organization_ids())
    )
  );
