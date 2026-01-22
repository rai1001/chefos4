-- =====================================================
-- PRODUCTION TASKS: Tareas de producción
-- =====================================================
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS production_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES events(id) ON DELETE CASCADE,
  recipe_id UUID NULL REFERENCES recipes(id) ON DELETE SET NULL,
  
  -- Información de la tarea
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- Planificación
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ NULL,
  actual_end TIMESTAMPTZ NULL,
  
  -- Estimaciones
  estimated_duration_minutes INTEGER NOT NULL,
  actual_duration_minutes INTEGER NULL,
  
  -- Estado y prioridad
  status task_status DEFAULT 'PENDING',
  priority task_priority DEFAULT 'MEDIUM',
  
  -- Asignación
  assigned_to UUID NULL REFERENCES users(id),
  station VARCHAR(100) NULL, -- Partida: 'CARNES', 'PESCADOS', 'PASTELERIA', etc.
  
  -- Progreso
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_schedule CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX IF NOT EXISTS idx_production_tasks_org ON production_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_event ON production_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status ON production_tasks(status);
CREATE INDEX IF NOT EXISTS idx_production_tasks_assigned ON production_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_tasks_schedule ON production_tasks(scheduled_start, scheduled_end);

-- =====================================================
-- TASK DEPENDENCIES: Dependencias entre tareas
-- =====================================================
DO $$ BEGIN
    CREATE TYPE dependency_type AS ENUM (
      'FINISH_TO_START',  -- Tarea B empieza cuando A termina
      'START_TO_START',   -- Tarea B empieza cuando A empieza
      'FINISH_TO_FINISH', -- Tarea B termina cuando A termina
      'START_TO_FINISH'   -- Tarea B termina cuando A empieza
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  predecessor_task_id UUID NOT NULL REFERENCES production_tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES production_tasks(id) ON DELETE CASCADE,
  
  dependency_type dependency_type DEFAULT 'FINISH_TO_START',
  
  -- Delay en minutos (puede ser positivo o negativo)
  lag_minutes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(predecessor_task_id, successor_task_id),
  CHECK (predecessor_task_id != successor_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_deps_predecessor ON task_dependencies(predecessor_task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_successor ON task_dependencies(successor_task_id);

-- =====================================================
-- FUNCIÓN: Generar tareas automáticamente desde evento
-- =====================================================
CREATE OR REPLACE FUNCTION generate_production_tasks_from_event(
  p_event_id UUID,
  p_base_start_time TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
  v_menu RECORD;
  v_task_id UUID;
  v_tasks_created INTEGER := 0;
  v_org_id UUID;
BEGIN
  -- Obtener org_id
  SELECT organization_id INTO v_org_id FROM events WHERE id = p_event_id;

  -- Iterar sobre los menús del evento
  FOR v_menu IN
    SELECT em.*, r.name as recipe_name, r.id as recipe_id
    FROM event_menus em
    JOIN recipes r ON em.recipe_id = r.id
    WHERE em.event_id = p_event_id
  LOOP
    -- Crear tarea de producción
    INSERT INTO production_tasks (
      organization_id,
      event_id,
      recipe_id,
      title,
      scheduled_start,
      scheduled_end,
      estimated_duration_minutes,
      status
    )
    VALUES (
      v_org_id,
      p_event_id,
      v_menu.recipe_id,
      'Producir: ' || v_menu.recipe_name,
      p_base_start_time + (v_tasks_created * INTERVAL '30 minutes'),
      p_base_start_time + ((v_tasks_created + 1) * INTERVAL '30 minutes'),
      30,
      'PENDING'
    )
    RETURNING id INTO v_task_id;
    
    v_tasks_created := v_tasks_created + 1;
  END LOOP;
  
  RETURN v_tasks_created;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_production_tasks_from_event IS 'Genera tareas de producción automáticamente desde un evento';
