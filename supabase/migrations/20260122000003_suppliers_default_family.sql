ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS default_family_id UUID NULL REFERENCES product_families(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_default_family ON suppliers(default_family_id);

COMMENT ON COLUMN suppliers.default_family_id IS 'Familia por defecto para ingredientes importados sin familia';
