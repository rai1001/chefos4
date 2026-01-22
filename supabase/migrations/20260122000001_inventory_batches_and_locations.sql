-- =====================================================
-- Sprint 15: Inventory Batches + Storage Locations + FEFO
-- Fecha: 2026-01-22
-- =====================================================

-- Delivery note items (line items)
CREATE TABLE IF NOT EXISTS delivery_note_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity >= 0),
  unit_price DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  ingredient_id UUID NULL REFERENCES ingredients(id) ON DELETE SET NULL,
  unit_id UUID NULL REFERENCES units(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, LINKED, IGNORED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS imported_by UUID NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_note_items_org ON delivery_note_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_note ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_ingredient ON delivery_note_items(ingredient_id);

ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization isolation for delivery_note_items" ON delivery_note_items FOR ALL
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- Storage locations
CREATE TABLE IF NOT EXISTS storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_storage_locations_org ON storage_locations(organization_id);

ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization isolation for storage_locations" ON storage_locations FOR ALL
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- Inventory batches (lots)
CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  quantity_received DECIMAL(12,3) NOT NULL CHECK (quantity_received >= 0),
  quantity_current DECIMAL(12,3) NOT NULL CHECK (quantity_current >= 0),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  expiry_date DATE NULL,
  lot_code VARCHAR(100) NULL,
  delivery_note_item_id UUID NULL REFERENCES delivery_note_items(id) ON DELETE SET NULL,
  storage_location_id UUID NULL REFERENCES storage_locations(id) ON DELETE SET NULL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_org ON inventory_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_ingredient ON inventory_batches(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_location ON inventory_batches(storage_location_id);

ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization isolation for inventory_batches" ON inventory_batches FOR ALL
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- Stock movement to batch link
CREATE TABLE IF NOT EXISTS stock_movement_batches (
  movement_id UUID NOT NULL REFERENCES stock_movements(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (movement_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_movement_batches_batch ON stock_movement_batches(batch_id);

ALTER TABLE stock_movement_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stock movement batches isolation" ON stock_movement_batches FOR ALL
  USING (
    movement_id IN (
      SELECT id FROM stock_movements
      WHERE organization_id IN (SELECT public.user_organization_ids())
    )
  );

-- =====================================================
-- Functions: create batch + FEFO consumption
-- =====================================================

CREATE OR REPLACE FUNCTION create_inventory_batch(
  p_organization_id UUID,
  p_ingredient_id UUID,
  p_unit_id UUID,
  p_quantity DECIMAL,
  p_received_at TIMESTAMPTZ DEFAULT NOW(),
  p_expiry_date DATE DEFAULT NULL,
  p_lot_code TEXT DEFAULT NULL,
  p_delivery_note_item_id UUID DEFAULT NULL,
  p_storage_location_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_purchase_order_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
  v_movement_id UUID;
BEGIN
  INSERT INTO inventory_batches (
    organization_id,
    ingredient_id,
    unit_id,
    quantity_received,
    quantity_current,
    received_at,
    expiry_date,
    lot_code,
    delivery_note_item_id,
    storage_location_id,
    created_by
  ) VALUES (
    p_organization_id,
    p_ingredient_id,
    p_unit_id,
    p_quantity,
    p_quantity,
    p_received_at,
    p_expiry_date,
    p_lot_code,
    p_delivery_note_item_id,
    p_storage_location_id,
    p_user_id
  )
  RETURNING id INTO v_batch_id;

  PERFORM increment_ingredient_stock(p_ingredient_id, p_quantity);

  INSERT INTO stock_movements (
    organization_id,
    ingredient_id,
    movement_type,
    quantity,
    unit_id,
    user_id,
    purchase_order_id,
    notes
  ) VALUES (
    p_organization_id,
    p_ingredient_id,
    'IN',
    p_quantity,
    p_unit_id,
    p_user_id,
    p_purchase_order_id,
    p_notes
  )
  RETURNING id INTO v_movement_id;

  INSERT INTO stock_movement_batches (movement_id, batch_id, quantity)
  VALUES (v_movement_id, v_batch_id, p_quantity);

  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION consume_inventory_fefo(
  p_organization_id UUID,
  p_ingredient_id UUID,
  p_unit_id UUID,
  p_quantity DECIMAL,
  p_movement_type VARCHAR,
  p_user_id UUID DEFAULT NULL,
  p_production_order_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_remaining DECIMAL := p_quantity;
  v_available DECIMAL := 0;
  v_take DECIMAL;
  v_movement_id UUID;
  v_batch RECORD;
BEGIN
  SELECT COALESCE(SUM(quantity_current), 0) INTO v_available
  FROM inventory_batches
  WHERE organization_id = p_organization_id
    AND ingredient_id = p_ingredient_id
    AND quantity_current > 0;

  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient batch stock for ingredient %', p_ingredient_id;
  END IF;

  INSERT INTO stock_movements (
    organization_id,
    ingredient_id,
    movement_type,
    quantity,
    unit_id,
    user_id,
    production_order_id,
    notes
  ) VALUES (
    p_organization_id,
    p_ingredient_id,
    p_movement_type,
    p_quantity,
    p_unit_id,
    p_user_id,
    p_production_order_id,
    p_notes
  )
  RETURNING id INTO v_movement_id;

  FOR v_batch IN
    SELECT id, quantity_current
    FROM inventory_batches
    WHERE organization_id = p_organization_id
      AND ingredient_id = p_ingredient_id
      AND quantity_current > 0
    ORDER BY expiry_date NULLS LAST, received_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(v_batch.quantity_current, v_remaining);
    UPDATE inventory_batches
    SET quantity_current = quantity_current - v_take
    WHERE id = v_batch.id;

    INSERT INTO stock_movement_batches (movement_id, batch_id, quantity)
    VALUES (v_movement_id, v_batch.id, v_take);

    v_remaining := v_remaining - v_take;
  END LOOP;

  PERFORM decrement_ingredient_stock(p_ingredient_id, p_quantity);

  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_inventory_batch IS 'Crea un lote y registra movimiento IN, actualizando stock_current';
COMMENT ON FUNCTION consume_inventory_fefo IS 'Consume stock por FEFO y registra movimiento OUT/WASTE/ADJUSTMENT';
