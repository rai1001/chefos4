# SPRINT 10: Planificación de Producción con Gantt 📅


**Objetivo:** Implementar timeline visual de producción con dependencias entre tareas.


---


### Migración: Production Planning


`supabase/migrations/20250225000001_production_planning.sql`:
```sql
-- =====================================================
-- PRODUCTION TASKS: Tareas de producción
-- =====================================================
CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');


CREATE TABLE production_tasks (
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


CREATE INDEX idx_production_tasks_org ON production_tasks(organization_id);
CREATE INDEX idx_production_tasks_event ON production_tasks(event_id);
CREATE INDEX idx_production_tasks_status ON production_tasks(status);
CREATE INDEX idx_production_tasks_assigned ON production_tasks(assigned_to);
CREATE INDEX idx_production_tasks_schedule ON production_tasks(scheduled_start, scheduled_end);


-- =====================================================
-- TASK DEPENDENCIES: Dependencias entre tareas
-- =====================================================
CREATE TYPE dependency_type AS ENUM (
  'FINISH_TO_START',  -- Tarea B empieza cuando A termina
  'START_TO_START',   -- Tarea B empieza cuando A empieza
  'FINISH_TO_FINISH', -- Tarea B termina cuando A termina
  'START_TO_FINISH'   -- Tarea B termina cuando A empieza
);


CREATE TABLE task_dependencies (
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


CREATE INDEX idx_task_deps_predecessor ON task_dependencies(predecessor_task_id);
CREATE INDEX idx_task_deps_successor ON task_dependencies(successor_task_id);


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
BEGIN
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
    SELECT 
      (SELECT organization_id FROM events WHERE id = p_event_id),
      p_event_id,
      v_menu.recipe_id,
      'Producir: ' || v_menu.recipe_name,
      p_base_start_time + (v_tasks_created * INTERVAL '30 minutes'),
      p_base_start_time + ((v_tasks_created + 1) * INTERVAL '30 minutes'),
      30,
      'PENDING'
    RETURNING id INTO v_task_id;
    
    v_tasks_created := v_tasks_created + 1;
  END LOOP;
  
  RETURN v_tasks_created;
END;
$$ LANGUAGE plpgsql;


COMMENT ON FUNCTION generate_production_tasks_from_event IS 'Genera tareas de producción automáticamente desde un evento';
```


---


### Frontend - Gantt Component (con react-gantt-chart)


`frontend/src/components/production/ProductionGantt.tsx`:
```tsx
import { useState } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { useProductionTasks } from '@/hooks/useProductionTasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


interface ProductionGanttProps {
  eventId?: string;
  startDate?: Date;
  endDate?: Date;
}


export function ProductionGantt({ eventId, startDate, endDate }: ProductionGanttProps) {
  const [viewMode, setViewMode] = useState(ViewMode.Hour);
  const { data: tasks, isLoading } = useProductionTasks({ event_id: eventId });


  if (isLoading) {
    return Cargando timeline...;
  }


  // Convertir tareas a formato Gantt
  const ganttTasks: Task[] = (tasks || []).map((task) => ({
    id: task.id,
    name: task.title,
    start: new Date(task.scheduled_start),
    end: new Date(task.scheduled_end),
    progress: task.progress_pct || 0,
    type: 'task',
    dependencies: [], // TODO: Cargar dependencias
    styles: {
      backgroundColor: getStatusColor(task.status),
      progressColor: '#4ade80',
      progressSelectedColor: '#22c55e',
    },
  }));


  return (
    
      
        
          Timeline de Producción
          
            <Button
              variant={viewMode === ViewMode.Hour ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(ViewMode.Hour)}
            >
              Horas
            
            <Button
              variant={viewMode === ViewMode.QuarterDay ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(ViewMode.QuarterDay)}
            >
              6 Horas
            
            <Button
              variant={viewMode === ViewMode.Day ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(ViewMode.Day)}
            >
              Días
            
          
        
      
      
        {ganttTasks.length > 0 ? (
          <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            locale="es"
            columnWidth={viewMode === ViewMode.Hour ? 65 : 100}
            listCellWidth=""
            todayColor="rgba(252, 211, 77, 0.3)"
          />
        ) : (
          
            No hay tareas planificadas
          
        )}
      
    
  );
}


function getStatusColor(status: string): string {
  const colors: Record = {
    PENDING: '#94a3b8',
    IN_PROGRESS: '#3b82f6',
    COMPLETED: '#22c55e',
    BLOCKED: '#ef4444',
    CANCELLED: '#64748b',
  };
  return colors[status] || '#94a3b8';
}
```


---


Continuaré con **Feature 6, 7, 8 y 9** en el siguiente mensaje. ¿Sigo?Si0:492 / 2🚀 MVP 2.0 - FEATURES 6, 7, 8, 9 CONTINUACIÓN


📄 SPRINT 11: Exportación de Reportes (PDF/Excel)
