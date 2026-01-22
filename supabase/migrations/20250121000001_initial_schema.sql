-- =====================================================
-- CULINARYOS MVP - SCHEMA COMPLETO
-- Versión: 1.0.0
-- Fecha: 2025-01-21
-- =====================================================


-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- =====================================================
-- ENUMS
-- =====================================================


-- Roles de usuario en organización
CREATE TYPE organization_role AS ENUM (
  'ORG_ADMIN',      -- Acceso total
  'AREA_MANAGER',   -- Gestión de área
  'COOK',           -- Solo cocina
  'SERVER'          -- Solo servicio
);


-- Tipos de evento
CREATE TYPE event_type AS ENUM (
  'BANQUET',        -- Evento cerrado (exactitud total)
  'A_LA_CARTE',     -- Menú del día (estimación)
  'COFFEE',         -- Coffee break
  'BUFFET',         -- Buffet
  'COCKTAIL',       -- Cóctel
  'COMPANY_MENU',   -- Menú empresa
  'TOURIST_MENU',   -- Menú turista
  'SPORTS_MULTI'    -- Contenedor de servicios deportivos
);


-- Estados de evento
CREATE TYPE event_status AS ENUM (
  'DRAFT',          -- Borrador
  'CONFIRMED',      -- Confirmado
  'IN_PROGRESS',    -- En curso
  'COMPLETED',      -- Completado
  'CANCELLED'       -- Cancelado
);


-- Estados de orden de compra
CREATE TYPE purchase_order_status AS ENUM (
  'DRAFT',          -- Borrador
  'SENT',           -- Enviada
  'RECEIVED',       -- Recibida
  'PARTIAL',        -- Recibida parcialmente
  'CANCELLED'       -- Cancelada
);


-- Tipos de unidad de medida
CREATE TYPE unit_type AS ENUM (
  'MASS',           -- Masa (kg, g)
  'VOLUME',         -- Volumen (l, ml)
  'UNIT',           -- Unidad (piezas, cajas)
  'LENGTH'          -- Longitud (m, cm)
);


-- Estados de producción
CREATE TYPE production_status AS ENUM (
  'PENDING',        -- Pendiente
  'PAUSED',         -- Pausada (esperando insumos)
  'READY',          -- Lista para cocinar
  'IN_PROGRESS',    -- En curso
  'COMPLETED'       -- Completada
);


-- Planes de suscripción
CREATE TYPE subscription_plan AS ENUM (
  'FREE',
  'PRO',
  'ENTERPRISE'
);


-- =====================================================
-- TABLA: organizations (Multi-tenant)
-- =====================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  plan subscription_plan DEFAULT 'FREE',
  max_users INTEGER DEFAULT 5,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraints
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);


-- Índices
CREATE INDEX idx_organizations_plan ON organizations(plan);
CREATE INDEX idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NULL;


-- =====================================================
-- TABLA: users (Autenticación)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Metadata
  email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraints
  CONSTRAINT email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);


-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;


-- =====================================================
-- TABLA: organization_members (Tabla Puente)
-- =====================================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'COOK',
  
  -- Metadata
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, organization_id)
);


-- Índices
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_role ON organization_members(role);


-- =====================================================
-- TABLA: product_families (Familias de Producto)
-- =====================================================
CREATE TABLE product_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- Safety Buffer (% de seguridad para compras)
  safety_buffer_pct DECIMAL(5,2) DEFAULT 1.10 CHECK (safety_buffer_pct >= 1.00 AND safety_buffer_pct <= 2.00),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, name)
);


-- Índices
CREATE INDEX idx_families_org ON product_families(organization_id);


-- Datos iniciales (SEED)
COMMENT ON COLUMN product_families.safety_buffer_pct IS 'Margen de seguridad: Vegetales=1.15, Carnes=1.05, Lácteos=1.08';


-- =====================================================
-- TABLA: units (Unidades de Medida)
-- =====================================================
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  abbreviation VARCHAR(10) NOT NULL UNIQUE,
  type unit_type NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT abbr_not_empty CHECK (LENGTH(TRIM(abbreviation)) > 0)
);


-- Índices
CREATE INDEX idx_units_type ON units(type);


-- =====================================================
-- TABLA: uom_conversions (Conversiones de Unidades)
-- =====================================================
CREATE TABLE uom_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  to_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  factor DECIMAL(12,4) NOT NULL CHECK (factor > 0),
  
  -- NULL = conversión global, UUID = conversión específica de ingrediente
  ingredient_id UUID NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(from_unit_id, to_unit_id, ingredient_id),
  CHECK (from_unit_id != to_unit_id)
);


-- Índices
CREATE INDEX idx_conversions_from ON uom_conversions(from_unit_id);
CREATE INDEX idx_conversions_to ON uom_conversions(to_unit_id);
CREATE INDEX idx_conversions_ingredient ON uom_conversions(ingredient_id) WHERE ingredient_id IS NOT NULL;


COMMENT ON COLUMN uom_conversions.ingredient_id IS 'NULL = global, UUID = específico del ingrediente';


-- =====================================================
-- TABLA: suppliers (Proveedores)
-- =====================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(50) NULL,
  
  -- Logística
  lead_time_days INTEGER DEFAULT 2 CHECK (lead_time_days >= 0),
  cut_off_time TIME NULL,  -- Hora límite para pedidos (ej. 11:00:00)
  delivery_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Lunes=1, Domingo=7
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraints
  UNIQUE(organization_id, name)
);


-- Índices
CREATE INDEX idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX idx_suppliers_deleted ON suppliers(deleted_at) WHERE deleted_at IS NULL;


COMMENT ON COLUMN suppliers.cut_off_time IS 'Hora límite para pedido next-day (ej. 11:00)';
COMMENT ON COLUMN suppliers.delivery_days IS 'Array de días: 1=Lunes, 7=Domingo';


-- =====================================================
-- TABLA: ingredients (Ingredientes)
-- =====================================================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  family_id UUID NULL REFERENCES product_families(id) ON DELETE SET NULL,
  supplier_id UUID NULL REFERENCES suppliers(id) ON DELETE SET NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- Costes y stock
  cost_price DECIMAL(10,2) DEFAULT 0.00 CHECK (cost_price >= 0),
  unit_id UUID NOT NULL REFERENCES units(id),
  stock_current DECIMAL(12,3) DEFAULT 0.00 CHECK (stock_current >= 0),
  stock_min DECIMAL(12,3) DEFAULT 0.00 CHECK (stock_min >= 0),
  
  -- Código de barras/QR
  barcode VARCHAR(100) NULL UNIQUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraints
  UNIQUE(organization_id, name, supplier_id)
);


-- Índices
CREATE INDEX idx_ingredients_org ON ingredients(organization_id);
CREATE INDEX idx_ingredients_family ON ingredients(family_id);
CREATE INDEX idx_ingredients_supplier ON ingredients(supplier_id);
CREATE INDEX idx_ingredients_barcode ON ingredients(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_ingredients_deleted ON ingredients(deleted_at) WHERE deleted_at IS NULL;


-- =====================================================
-- TABLA: recipes (Recetas Maestras)
-- =====================================================
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  servings INTEGER DEFAULT 1 CHECK (servings > 0),
  
  -- Costes calculados
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  cost_per_serving DECIMAL(10,2) DEFAULT 0.00,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraints
  UNIQUE(organization_id, name)
);


-- Índices
CREATE INDEX idx_recipes_org ON recipes(organization_id);
CREATE INDEX idx_recipes_deleted ON recipes(deleted_at) WHERE deleted_at IS NULL;


-- =====================================================
-- TABLA: recipe_ingredients (Escandallo)
-- =====================================================
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  unit_id UUID NOT NULL REFERENCES units(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(recipe_id, ingredient_id)
);


-- Índices
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);


-- =====================================================
-- TABLA: events (Eventos/Banquetes)
-- =====================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  event_type event_type NOT NULL,
  status event_status DEFAULT 'DRAFT',
  
  -- Fechas
  date_start TIMESTAMPTZ NOT NULL,
  date_end TIMESTAMPTZ NULL,
  
  -- Pax (personas)
  pax INTEGER DEFAULT 0 CHECK (pax >= 0),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraints
  CHECK (date_end IS NULL OR date_end >= date_start)
);


-- Índices
CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date_start ON events(date_start);
CREATE INDEX idx_events_deleted ON events(deleted_at) WHERE deleted_at IS NULL;


-- =====================================================
-- TABLA: event_menus (Menús del Evento)
-- =====================================================
CREATE TABLE event_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  recipe_id UUID NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Cantidad prevista (para A_LA_CARTE usa forecasting)
  qty_forecast INTEGER DEFAULT 0 CHECK (qty_forecast >= 0),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(event_id, recipe_id)
);


-- Índices
CREATE INDEX idx_event_menus_event ON event_menus(event_id);
CREATE INDEX idx_event_menus_recipe ON event_menus(recipe_id);


-- =====================================================
-- TABLA: event_direct_ingredients (Para SPORTS_MULTI)
-- =====================================================
CREATE TABLE event_direct_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  unit_id UUID NOT NULL REFERENCES units(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(event_id, ingredient_id)
);


-- Índices
CREATE INDEX idx_direct_ingredients_event ON event_direct_ingredients(event_id);
CREATE INDEX idx_direct_ingredients_ingredient ON event_direct_ingredients(ingredient_id);


COMMENT ON TABLE event_direct_ingredients IS 'Ingredientes directos para SPORTS_MULTI (no crean receta permanente)';


-- =====================================================
-- TABLA: purchase_orders (Órdenes de Compra)
-- =====================================================
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES events(id) ON DELETE SET NULL,
  
  status purchase_order_status DEFAULT 'DRAFT',
  
  -- Fechas
  order_date TIMESTAMPTZ DEFAULT NOW(),
  delivery_date_estimated TIMESTAMPTZ NULL,
  delivery_date_actual TIMESTAMPTZ NULL,
  
  -- Costes
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);


-- Índices
CREATE INDEX idx_po_org ON purchase_orders(organization_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_event ON purchase_orders(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_deleted ON purchase_orders(deleted_at) WHERE deleted_at IS NULL;


-- =====================================================
-- TABLA: purchase_order_items (Líneas de PO)
-- =====================================================
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  
  quantity_ordered DECIMAL(12,3) NOT NULL CHECK (quantity_ordered > 0),
  quantity_received DECIMAL(12,3) DEFAULT 0.00 CHECK (quantity_received >= 0),
  unit_id UUID NOT NULL REFERENCES units(id),
  
  unit_price DECIMAL(10,2) DEFAULT 0.00,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(purchase_order_id, ingredient_id)
);


-- Índices
CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_ingredient ON purchase_order_items(ingredient_id);


-- =====================================================
-- TABLA: production_orders (Órdenes de Producción)
-- =====================================================
CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES events(id) ON DELETE CASCADE,
  recipe_id UUID NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  status production_status DEFAULT 'PENDING',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  
  -- Fechas
  scheduled_date TIMESTAMPTZ NOT NULL,
  completed_date TIMESTAMPTZ NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Índices
CREATE INDEX idx_production_org ON production_orders(organization_id);
CREATE INDEX idx_production_event ON production_orders(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_production_status ON production_orders(status);
CREATE INDEX idx_production_scheduled ON production_orders(scheduled_date);


-- =====================================================
-- TABLA: stock_movements (Movimientos de Inventario)
-- =====================================================
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  
  movement_type VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT', 'WASTE'
  quantity DECIMAL(12,3) NOT NULL,
  unit_id UUID NOT NULL REFERENCES units(id),
  
  -- Referencias opcionales
  purchase_order_id UUID NULL REFERENCES purchase_orders(id) ON DELETE SET NULL,
  production_order_id UUID NULL REFERENCES production_orders(id) ON DELETE SET NULL,
  
  -- Usuario que realizó el movimiento
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  
  notes TEXT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Índices
CREATE INDEX idx_stock_movements_org ON stock_movements(organization_id);
CREATE INDEX idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);


-- =====================================================
-- TRIGGERS: updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_families_updated_at BEFORE UPDATE ON product_families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON production_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- FUNCIONES DE NEGOCIO
-- =====================================================


-- Función: Calcular Safety Buffer según familia
CREATE OR REPLACE FUNCTION get_safety_buffer(p_family_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_buffer DECIMAL;
BEGIN
  SELECT safety_buffer_pct INTO v_buffer
  FROM product_families
  WHERE id = p_family_id;
  
  RETURN COALESCE(v_buffer, 1.10); -- Default 10%
END;
$$ LANGUAGE plpgsql;


-- Función: Calcular fecha estimada de entrega
CREATE OR REPLACE FUNCTION calculate_delivery_date(
  p_supplier_id UUID,
  p_order_datetime TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_cut_off_time TIME;
  v_lead_time_days INTEGER;
  v_delivery_days INTEGER[];
  v_current_time TIME;
  v_current_date DATE;
  v_estimated_date DATE;
  v_day_of_week INTEGER;
BEGIN
  -- Obtener datos del proveedor
  SELECT cut_off_time, lead_time_days, delivery_days
  INTO v_cut_off_time, v_lead_time_days, v_delivery_days
  FROM suppliers
  WHERE id = p_supplier_id;
  
  v_current_time := p_order_datetime::TIME;
  v_current_date := p_order_datetime::DATE;
  
  -- Si hay hora de corte y ya pasó, sumar 1 día
  IF v_cut_off_time IS NOT NULL AND v_current_time >= v_cut_off_time THEN
    v_current_date := v_current_date + INTERVAL '1 day';
  END IF;
  
  -- Sumar lead time (solo días hábiles L-V)
  v_estimated_date := v_current_date;
  FOR i IN 1..v_lead_time_days LOOP
    v_estimated_date := v_estimated_date + INTERVAL '1 day';
    -- Saltar fines de semana
    WHILE EXTRACT(DOW FROM v_estimated_date) IN (0, 6) LOOP
      v_estimated_date := v_estimated_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
  
  -- Buscar siguiente día de reparto válido
  LOOP
    v_day_of_week := EXTRACT(DOW FROM v_estimated_date);
    -- Convertir Domingo (0) a 7
    IF v_day_of_week = 0 THEN
      v_day_of_week := 7;
    END IF;
    
    IF v_day_of_week = ANY(v_delivery_days) THEN
      EXIT;
    END IF;
    
    v_estimated_date := v_estimated_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN v_estimated_date::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;


COMMENT ON FUNCTION calculate_delivery_date IS 'Calcula fecha estimada de entrega considerando cut_off_time, lead_time y delivery_days';


-- =====================================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- =====================================================


-- Búsqueda de ingredientes por nombre (case-insensitive)
CREATE INDEX idx_ingredients_name_trgm ON ingredients USING gin(name gin_trgm_ops);


-- Búsqueda de proveedores por nombre
CREATE INDEX idx_suppliers_name_trgm ON suppliers USING gin(name gin_trgm_ops);


-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================


COMMENT ON DATABASE postgres IS 'CulinaryOS MVP - Sistema de Gestión de Cocinas Profesionales';
