-- Nota: Esto se ejecutará después de crear la primera organización
-- Por ahora, crear función helper


CREATE OR REPLACE FUNCTION seed_product_families(p_org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO product_families (organization_id, name, description, safety_buffer_pct) VALUES
    (p_org_id, 'Carnes y Pescados', 'Productos cárnicos y pescados frescos', 1.05),
    (p_org_id, 'Vegetales y Frutas', 'Productos frescos de origen vegetal', 1.15),
    (p_org_id, 'Lácteos', 'Leche, quesos, yogures y derivados', 1.08),
    (p_org_id, 'Secos y Abarrotes', 'Productos no perecederos', 1.10),
    (p_org_id, 'Bebidas', 'Bebidas alcohólicas y no alcohólicas', 1.02),
    (p_org_id, 'Panadería', 'Pan, bollería y masas', 1.12),
    (p_org_id, 'Congelados', 'Productos ultracongelados', 1.08),
    (p_org_id, 'Especias y Condimentos', 'Condimentos, hierbas y especias', 1.05)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;


COMMENT ON FUNCTION seed_product_families IS 'Crea familias de producto por defecto para una organización';
