-- Waste Management Schema

-- 1. Create table for Waste Causes
CREATE TABLE IF NOT EXISTS waste_causes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Nullable for system defaults
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add Waste specific columns to Inventory Logs
ALTER TABLE IF EXISTS inventory_logs
ADD COLUMN IF NOT EXISTS waste_cause_id UUID REFERENCES waste_causes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(12,2); -- Snapshot of cost at time of waste

-- 3. Enable RLS
ALTER TABLE waste_causes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Allow users to see their org's causes AND system defaults
DROP POLICY IF EXISTS "View waste causes" ON waste_causes;
CREATE POLICY "View waste causes" ON waste_causes FOR SELECT
USING (
    organization_id IN (SELECT public.user_organization_ids()) 
    OR 
    (organization_id IS NULL AND is_system = true)
);

-- Allow users to manage ONLY their org's causes
DROP POLICY IF EXISTS "Manage waste causes" ON waste_causes;
CREATE POLICY "Manage waste causes" ON waste_causes FOR ALL
USING (organization_id IN (SELECT public.user_organization_ids()));

-- 5. Seed System Defaults (Optional but good for immediate usage)
INSERT INTO waste_causes (name, description, is_system)
SELECT 'Caducidad', 'Producto vencido o en mal estado', true
WHERE NOT EXISTS (SELECT 1 FROM waste_causes WHERE name = 'Caducidad' AND is_system = true);
INSERT INTO waste_causes (name, description, is_system)
SELECT 'Error de Elaboración', 'Error durante la cocción o preparación', true
WHERE NOT EXISTS (SELECT 1 FROM waste_causes WHERE name = 'Error de Elaboración' AND is_system = true);
INSERT INTO waste_causes (name, description, is_system)
SELECT 'Deterioro/Rotura', 'Producto dañado por manejo inadecuado o accidente', true
WHERE NOT EXISTS (SELECT 1 FROM waste_causes WHERE name = 'Deterioro/Rotura' AND is_system = true);
INSERT INTO waste_causes (name, description, is_system)
SELECT 'Exceso de Producción', 'Sobran preparaciones que no se pueden reutilizar', true
WHERE NOT EXISTS (SELECT 1 FROM waste_causes WHERE name = 'Exceso de Producción' AND is_system = true);
INSERT INTO waste_causes (name, description, is_system)
SELECT 'Devolución Cliente', 'Plato devuelto por el cliente', true
WHERE NOT EXISTS (SELECT 1 FROM waste_causes WHERE name = 'Devolución Cliente' AND is_system = true);
INSERT INTO waste_causes (name, description, is_system)
SELECT 'Muestras/Catas', 'Producto utilizado para pruebas de calidad', true
WHERE NOT EXISTS (SELECT 1 FROM waste_causes WHERE name = 'Muestras/Catas' AND is_system = true);
