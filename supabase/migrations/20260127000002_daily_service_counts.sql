CREATE TABLE IF NOT EXISTS daily_service_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  occupancy_forecast INTEGER DEFAULT 0,
  occupancy_actual INTEGER DEFAULT 0,
  breakfasts_forecast INTEGER DEFAULT 0,
  lunches_forecast INTEGER DEFAULT 0,
  dinners_forecast INTEGER DEFAULT 0,
  breakfasts_actual INTEGER DEFAULT 0,
  lunches_actual INTEGER DEFAULT 0,
  dinners_actual INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, service_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_service_counts_org
  ON daily_service_counts(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_service_counts_date
  ON daily_service_counts(service_date);

CREATE TRIGGER update_daily_service_counts_updated_at
  BEFORE UPDATE ON daily_service_counts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE daily_service_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view daily service counts" ON daily_service_counts;
CREATE POLICY "Users can view daily service counts"
  ON daily_service_counts FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

DROP POLICY IF EXISTS "Admins can manage daily service counts" ON daily_service_counts;
CREATE POLICY "Admins can manage daily service counts"
  ON daily_service_counts FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('ORG_ADMIN', 'AREA_MANAGER')
    )
  );
