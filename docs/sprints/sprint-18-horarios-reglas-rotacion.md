# SPRINT 18: Horarios v2 — Reglas por empleado + rotaciones + finde libre 🧩🗓️

**Duración:** 1 semana (5 días laborables)  
**Objetivo:** añadir un **motor de reglas** para que el horario mensual (Sprint 16) respete preferencias y restricciones:
- empleado “solo mañanas” / “solo tardes” / “rotativo”,
- días libres **rotativos**,
- cada empleado disfruta de **1 fin de semana libre/mes** (2 días consecutivos),
- validaciones y avisos claros en UI.

> Este sprint se centra en **reglas + validación**. La **generación automática completa del mes con cobertura por día** se implementa en Sprint 19.

---

## 1) Alcance del Sprint

### 1.1 Reglas por empleado
**Ejemplos (del usuario)**
- “Empleado solo mañanas”
- “Rotativo tarde”
- “Días libres rotativos”

**Comportamiento**
- Configuración por empleado:
  - `allowed_shift_codes` (MORNING/AFTERNOON/NIGHT)
  - `rotation_mode` (NONE / WEEKLY / BIWEEKLY / MONTHLY)
  - `preferred_days_off` (opcional)
  - `max_consecutive_days` (opcional)
- Validación al asignar:
  - bloquea asignación si viola “solo mañanas” (hard),
  - advierte si rompe preferencia (soft).

---

### 1.2 Regla “fin de semana libre” (2 días consecutivos) por mes
**Requisito**
- “cada empleado disfrute de un finde semana libre por mes dos días consecutivos libres”.

**Definición MVP**
- Para cada empleado, al menos **un** par (sábado+domingo) del mes sin turnos asignados
  - (si la operación considera otros días como finde, parametrizable).

**Comportamiento**
- En vista mensual:
  - indicador “Finde libre OK / pendiente” por empleado.
- Validación:
  - si al publicar el mes algún empleado no cumple → bloquea publish o exige override con motivo.

---

### 1.3 Días libres rotativos
**Comportamiento**
- Regla de equipo (por organización):
  - “días libres rotativos” intentando equilibrar descansos en fines de semana.
- En primera iteración:
  - se implementa como **asistente** (sugerencias) + validación de desequilibrios,
  - no como optimizador perfecto.

---

## 2) Modelo de datos (DB)

### 2.1 Tablas nuevas
**`staff_schedule_rules`**
- id, organization_id, staff_id
- allowed_shift_codes (text[] / enum[])
- rotation_mode (enum)
- requires_weekend_off_per_month (boolean, default true)
- weekend_off_satisfied (computed en runtime o guardado al publicar)
- created_at, updated_at

**`organization_schedule_rules`**
- id, organization_id
- weekend_definition (SAT_SUN / FRI_SAT / custom)  *(opcional)*
- enforce_weekend_off_hard (boolean)
- rotation_enabled (boolean)
- created_at, updated_at

**(Opcional)**
- `schedule_publish_overrides` (para auditoría cuando se publica con excepciones)

---

## 3) Backend

### 3.1 Servicios
- `ScheduleRulesService` (CRUD de reglas)
- `ScheduleRulesValidator`:
  - valida asignaciones contra reglas por empleado,
  - valida “fin de semana libre” en el mes,
  - genera lista de errores/warnings.

### 3.2 Endpoints
- `GET /api/v1/schedule-rules/staff/:staffId`
- `PATCH /api/v1/schedule-rules/staff/:staffId`
- `GET /api/v1/schedule-rules/org`
- `PATCH /api/v1/schedule-rules/org`
- `POST /api/v1/schedules/months/:id/validate` (devuelve warnings/errores)
- `POST /api/v1/schedules/months/:id/publish` (ahora incluye validación y overrides)

---

## 4) Frontend

### 4.1 UI reglas por empleado
- En ficha de empleado:
  - selector “solo mañanas / solo tardes / rotativo”
  - allow-list de turnos
  - toggle “requiere finde libre/mes”

### 4.2 UI validaciones
- En horario mensual:
  - panel “Conflictos y avisos”
  - chips en días conflictivos (hover: por qué)
- Antes de publicar:
  - checklist: cobertura, ausencias, fin de semana libre, reglas de turno.

---

## 5) Plan de trabajo

### DÍA 1 — DB + endpoints reglas
- Migraciones reglas staff/org.
- RLS.

### DÍA 2 — Validator “solo mañanas / rotativo”
- Validaciones hard/soft.
- Tests unitarios del validador.

### DÍA 3 — Validator “fin de semana libre”
- Detección de weekend-off.
- Integración con publish.
- Tests de casos límite (mes con festivos, ausencias).

### DÍA 4 — UI reglas + panel validaciones
- Pantalla reglas por empleado.
- Panel de conflictos en el calendario.

### DÍA 5 — QA + docs
- E2E: asignar turno fuera de regla → bloquea.
- Publicar mes sin finde libre → bloquea o requiere override.

---

## 6) Definition of Done (DoD)
- ✅ Reglas por empleado configurables y validadas.
- ✅ Regla de “1 finde libre/mes (2 días consecutivos)” implementada.
- ✅ Validación antes de publicar y UX clara de conflictos.
