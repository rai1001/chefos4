-- Waste Management Schema

-- 1. Create table for Waste Causes
CREATE TABLE waste_causes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Nullable for system defaults
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add Waste specific columns to Inventory Logs
ALTER TABLE inventory_logs 
ADD COLUMN waste_cause_id UUID REFERENCES waste_causes(id) ON DELETE SET NULL,
ADD COLUMN cost_amount DECIMAL(12,2); -- Snapshot of cost at time of waste

-- 3. Enable RLS
ALTER TABLE waste_causes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Allow users to see their org's causes AND system defaults
CREATE POLICY "View waste causes" ON waste_causes FOR SELECT
USING (
    organization_id IN (SELECT public.user_organization_ids()) 
    OR 
    (organization_id IS NULL AND is_system = true)
);

-- Allow users to manage ONLY their org's causes
CREATE POLICY "Manage waste causes" ON waste_causes FOR ALL
USING (organization_id IN (SELECT public.user_organization_ids()));

-- 5. Seed System Defaults (Optional but good for immediate usage)
INSERT INTO waste_causes (name, description, is_system) VALUES 
('Caducidad', 'Producto vencido o en mal estado', true),
('Error de Elaboración', 'Error durante la cocción o preparación', true),
('Deterioro/Rotura', 'Producto dañado por manejo inadecuado o accidente', true),
('Exceso de Producción', 'Sobran preparaciones que no se pueden reutilizar', true),
('Devolución Cliente', 'Plato devuelto por el cliente', true),
('Muestras/Catas', 'Producto utilizado para pruebas de calidad', true);
