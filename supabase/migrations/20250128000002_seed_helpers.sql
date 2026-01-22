-- Helper function to seed product families for a new organization
CREATE OR REPLACE FUNCTION seed_product_families(p_org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO product_families (organization_id, name, safety_buffer_pct) VALUES
    (p_org_id, 'Carnes y Pescados', 1.05),
    (p_org_id, 'Vegetales y Frutas', 1.15),
    (p_org_id, 'Lácteos', 1.08),
    (p_org_id, 'Secos y Abarrotes', 1.10),
    (p_org_id, 'Bebidas', 1.02),
    (p_org_id, 'Panadería', 1.12),
    (p_org_id, 'Congelados', 1.08),
    (p_org_id, 'Especias y Condimentos', 1.05)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION seed_product_families IS 'Crea familias de producto por defecto para una organización';
