-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- UNITS
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  abbreviation VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_units_org ON units(organization_id);

-- PRODUCT FAMILIES
CREATE TABLE product_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  safety_buffer_pct DECIMAL(4,2) DEFAULT 1.10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_families_org ON product_families(organization_id);

-- SUPPLIERS
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  lead_time_days INTEGER DEFAULT 2,
  cut_off_time TIME,
  delivery_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- 1=Monday, 7=Sunday
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_org ON suppliers(organization_id);

-- INGREDIENTS
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  family_id UUID REFERENCES product_families(id) ON DELETE SET NULL,
  default_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  unit_id UUID NOT NULL REFERENCES units(id),
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock_min DECIMAL(12,2) DEFAULT 0,
  stock_current DECIMAL(12,2) DEFAULT 0,
  barcode VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_ingredients_org ON ingredients(organization_id);
CREATE INDEX idx_ingredients_family ON ingredients(family_id);

-- RECIPES
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_portions INTEGER DEFAULT 1,
  cost_per_portion DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_org ON recipes(organization_id);

-- RECIPE INGREDIENTS
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(12,4) NOT NULL,
  unit_id UUID NOT NULL REFERENCES units(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipe_ing_recipe ON recipe_ingredients(recipe_id);

-- EVENTS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'PLANNING', -- PLANNING, CONFIRMED, COMPLETED, CANCELLED
  guest_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_org ON events(organization_id);

-- EVENT RECIPES
CREATE TABLE event_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  planned_portions INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PURCHASE ORDERS
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, SENT, RECEIVED, CANCELLED
  total_amount DECIMAL(12,2) DEFAULT 0,
  expected_delivery_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PURCHASE ORDER ITEMS
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY LOGS
CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_change DECIMAL(12,2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- PURCHASE, WASTE, CONSUMPTION, ADJUSTMENT
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all new tables
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Generic RLS Policy for organization-based isolation
-- (Assumes auth.user_organization_ids() is already defined in migration 02)

DO $$ 
DECLARE 
  t text;
  tables text[] := ARRAY['units', 'product_families', 'suppliers', 'ingredients', 'recipes', 'events', 'purchase_orders', 'inventory_logs'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('CREATE POLICY "Organization isolation for %I" ON %I FOR ALL USING (organization_id IN (SELECT public.user_organization_ids()))', t, t);
  END LOOP;
END $$;

-- Fix for tables without organization_id (recipe_ingredients, purchase_order_items, event_recipes)
-- These should inherit access from their parents
DROP POLICY IF EXISTS "Organization isolation for recipe_ingredients" ON recipe_ingredients;
CREATE POLICY "Recipe based isolation for recipe_ingredients" ON recipe_ingredients FOR ALL
  USING (recipe_id IN (SELECT id FROM recipes));

DROP POLICY IF EXISTS "Organization isolation for purchase_order_items" ON purchase_order_items;
CREATE POLICY "PO based isolation for purchase_order_items" ON purchase_order_items FOR ALL
  USING (purchase_order_id IN (SELECT id FROM purchase_orders));

DROP POLICY IF EXISTS "Organization isolation for event_recipes" ON event_recipes;
CREATE POLICY "Event based isolation for event_recipes" ON event_recipes FOR ALL
  USING (event_id IN (SELECT id FROM events));
