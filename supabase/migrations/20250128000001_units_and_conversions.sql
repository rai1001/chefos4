-- Seed data: Unidades base
INSERT INTO units (name, abbreviation, type) VALUES
  ('Kilogramo', 'kg', 'MASS'),
  ('Gramo', 'g', 'MASS'),
  ('Litro', 'l', 'VOLUME'),
  ('Mililitro', 'ml', 'VOLUME'),
  ('Unidad', 'ud', 'UNIT'),
  ('Caja', 'cj', 'UNIT'),
  ('Docena', 'dz', 'UNIT'),
  ('Paquete', 'pq', 'UNIT'),
  ('Metro', 'm', 'LENGTH'),
  ('Centímetro', 'cm', 'LENGTH')
ON CONFLICT (abbreviation) DO NOTHING;


-- Conversiones globales
WITH unit_ids AS (
  SELECT 
    (SELECT id FROM units WHERE abbreviation = 'kg') AS kg_id,
    (SELECT id FROM units WHERE abbreviation = 'g') AS g_id,
    (SELECT id FROM units WHERE abbreviation = 'l') AS l_id,
    (SELECT id FROM units WHERE abbreviation = 'ml') AS ml_id,
    (SELECT id FROM units WHERE abbreviation = 'm') AS m_id,
    (SELECT id FROM units WHERE abbreviation = 'cm') AS cm_id,
    (SELECT id FROM units WHERE abbreviation = 'dz') AS dz_id,
    (SELECT id FROM units WHERE abbreviation = 'ud') AS ud_id
)
INSERT INTO uom_conversions (from_unit_id, to_unit_id, factor, ingredient_id) 
SELECT kg_id, g_id, 1000, NULL FROM unit_ids
UNION ALL
SELECT l_id, ml_id, 1000, NULL FROM unit_ids
UNION ALL
SELECT m_id, cm_id, 100, NULL FROM unit_ids
UNION ALL
SELECT dz_id, ud_id, 12, NULL FROM unit_ids
ON CONFLICT DO NOTHING;
