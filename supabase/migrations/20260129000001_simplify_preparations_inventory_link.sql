-- =====================================================
-- Simplify preparations: link to inventory batches
-- Fecha: 2026-01-29
-- =====================================================

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS is_preparation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preparation_id UUID NULL REFERENCES preparations(id) ON DELETE SET NULL;

ALTER TABLE preparation_batches
  ADD COLUMN IF NOT EXISTS inventory_batch_id UUID NULL REFERENCES inventory_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ingredients_preparation ON ingredients(preparation_id);
CREATE INDEX IF NOT EXISTS idx_preparation_batches_inventory ON preparation_batches(inventory_batch_id);
