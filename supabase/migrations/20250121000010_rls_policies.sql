-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Multi-tenant isolation por organization_id
-- =====================================================


-- Habilitar RLS en todas las tablas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE uom_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_direct_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- HELPER FUNCTION: Get User's Organization IDs
-- =====================================================
CREATE OR REPLACE FUNCTION auth.user_organization_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE;


-- =====================================================
-- POLICIES: organizations
-- =====================================================
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Org admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'ORG_ADMIN'
    )
  );


-- =====================================================
-- POLICIES: Tablas con organization_id directo
-- =====================================================


-- product_families
CREATE POLICY "Users can view families in their org"
  ON product_families FOR SELECT
  USING (organization_id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Admins can manage families"
  ON product_families FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('ORG_ADMIN', 'AREA_MANAGER')
    )
  );


-- suppliers
CREATE POLICY "Users can view suppliers in their org"
  ON suppliers FOR SELECT
  USING (organization_id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Admins can manage suppliers"
  ON suppliers FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('ORG_ADMIN', 'AREA_MANAGER')
    )
  );


-- ingredients
CREATE POLICY "Users can view ingredients in their org"
  ON ingredients FOR SELECT
  USING (organization_id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Admins can manage ingredients"
  ON ingredients FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('ORG_ADMIN', 'AREA_MANAGER')
    )
  );


-- recipes
CREATE POLICY "Users can view recipes in their org"
  ON recipes FOR SELECT
  USING (organization_id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Admins can manage recipes"
  ON recipes FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('ORG_ADMIN', 'AREA_MANAGER')
    )
  );


-- events
CREATE POLICY "Users can view events in their org"
  ON events FOR SELECT
  USING (organization_id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('ORG_ADMIN', 'AREA_MANAGER')
    )
  );


-- purchase_orders
CREATE POLICY "Users can view POs in their org"
  ON purchase_orders FOR SELECT
  USING (organization_id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Admins can manage POs"
  ON purchase_orders FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('ORG_ADMIN', 'AREA_MANAGER')
    )
  );


-- production_orders
CREATE POLICY "Users can view production orders in their org"
  ON production_orders FOR SELECT
  USING (organization_id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Cooks can update production status"
  ON production_orders FOR UPDATE
  USING (
    organization_id IN (SELECT auth.user_organization_ids())
  );


-- stock_movements
CREATE POLICY "Users can view stock movements in their org"
  ON stock_movements FOR SELECT
  USING (organization_id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Cooks can create stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT auth.user_organization_ids())
  );


-- =====================================================
-- POLICIES: Tablas sin organization_id (Global)
-- =====================================================


-- units (global, read-only para todos)
CREATE POLICY "Anyone can view units"
  ON units FOR SELECT
  USING (true);


-- uom_conversions
CREATE POLICY "Anyone can view conversions"
  ON uom_conversions FOR SELECT
  USING (true);


-- =====================================================
-- POLICIES: Tablas de relación (join tables)
-- =====================================================


-- recipe_ingredients
CREATE POLICY "Users can view recipe ingredients"
  ON recipe_ingredients FOR SELECT
  USING (
    recipe_id IN (
      SELECT id FROM recipes 
      WHERE organization_id IN (SELECT auth.user_organization_ids())
    )
  );


-- event_menus
CREATE POLICY "Users can view event menus"
  ON event_menus FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE organization_id IN (SELECT auth.user_organization_ids())
    )
  );


-- event_direct_ingredients
CREATE POLICY "Users can view event direct ingredients"
  ON event_direct_ingredients FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE organization_id IN (SELECT auth.user_organization_ids())
    )
  );


-- purchase_order_items
CREATE POLICY "Users can view PO items"
  ON purchase_order_items FOR SELECT
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders 
      WHERE organization_id IN (SELECT auth.user_organization_ids())
    )
  );


COMMENT ON POLICY "Users can view their organizations" ON organizations IS 'RLS: Multi-tenant isolation';
