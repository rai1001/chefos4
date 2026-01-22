-- =====================================================
-- FIX: Re-syncing inventory_logs/stock_movements
-- =====================================================

-- Rename inventory_logs to stock_movements if exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_logs') THEN
        ALTER TABLE inventory_logs RENAME TO stock_movements;
    END IF;
END $$;

-- Ensure columns match what register_stock_movement Expects
ALTER TABLE stock_movements 
  RENAME COLUMN type TO movement_type;

ALTER TABLE stock_movements 
  RENAME COLUMN quantity_change TO quantity;

ALTER TABLE stock_movements 
  RENAME COLUMN reason TO notes;

ALTER TABLE stock_movements 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id),
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id);

-- =====================================================
-- ANALYTICS VIEWS
-- =====================================================

-- 1. Inventory Valuation per Organization/Family
CREATE OR REPLACE VIEW v_inventory_valuation AS
SELECT 
    i.organization_id,
    f.name as family_name,
    SUM(i.stock_current * i.cost_price) as total_value,
    COUNT(*) as item_count
FROM ingredients i
JOIN product_families f ON i.family_id = f.id
WHERE i.deleted_at IS NULL
GROUP BY i.organization_id, f.name;

-- 2. Daily Consumption Stats (Past 30 days)
CREATE OR REPLACE VIEW v_consumption_stats AS
SELECT 
    organization_id,
    DATE_TRUNC('day', created_at) as day,
    movement_type,
    SUM(ABS(quantity)) as total_quantity
FROM stock_movements
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY organization_id, day, movement_type;

-- 3. Food Cost Metrics (Theoretical vs Real)
-- This joins event demand (planned) vs PO items (actual spent)
CREATE OR REPLACE VIEW v_food_cost_metrics AS
SELECT 
    e.organization_id,
    e.name as event_name,
    e.event_date,
    SUM(er.planned_portions * r.cost_per_portion) as theoretical_cost,
    (
        SELECT SUM(poi.quantity * poi.unit_price)
        FROM purchase_orders po
        JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        WHERE po.organization_id = e.organization_id
          AND po.created_at BETWEEN e.event_date - INTERVAL '7 days' AND e.event_date
    ) as actual_spent
FROM events e
JOIN event_recipes er ON e.id = er.event_id
JOIN recipes r ON er.recipe_id = r.id
WHERE e.status = 'CONFIRMED'
GROUP BY e.organization_id, e.id, e.name, e.event_date;

-- Permissions for Views
GRANT SELECT ON v_inventory_valuation TO authenticated;
GRANT SELECT ON v_consumption_stats TO authenticated;
GRANT SELECT ON v_food_cost_metrics TO authenticated;
