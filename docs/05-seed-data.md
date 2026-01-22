📦 SEED DATA
supabase/seed.sql
sql-- =====================================================
-- SEED DATA: Datos iniciales del sistema
-- =====================================================


-- Unidades de medida globales
INSERT INTO units (name, abbreviation, type) VALUES
  ('Kilogramo', 'kg', 'MASS'),
  ('Gramo', 'g', 'MASS'),
  ('Litro', 'l', 'VOLUME'),
  ('Mililitro', 'ml', 'VOLUME'),
  ('Unidad', 'ud', 'UNIT'),
  ('Caja', 'cj', 'UNIT'),
  ('Metro', 'm', 'LENGTH'),
  ('Centímetro', 'cm', 'LENGTH')
ON CONFLICT (abbreviation) DO NOTHING;


-- Conversiones globales
WITH unit_ids AS (
  SELECT 
    (SELECT id FROM units WHERE abbreviation = 'kg') AS kg_id,
    (SELECT id FROM units WHERE abbreviation = 'g') AS g_id,
    (SELECT id FROM units WHERE abbreviation = 'l') AS l_id,
    (SELECT id FROM units WHERE abbreviation = 'ml') AS ml_id
)
INSERT INTO uom_conversions (from_unit_id, to_unit_id, factor, ingredient_id) 
SELECT kg_id, g_id, 1000, NULL FROM unit_ids
UNION ALL
SELECT l_id, ml_id, 1000, NULL FROM unit_ids
ON CONFLICT DO NOTHING;


-- Familias de productos (ejemplo para org demo)
-- Nota: Requiere organization_id existente
-- Se insertarán vía API cuando se cree la primera organización


COMMENT ON TABLE units IS 'Datos seed: 8 unidades base + conversiones globales';
