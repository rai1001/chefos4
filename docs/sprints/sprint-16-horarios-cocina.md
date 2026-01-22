# SPRINT 16: Horarios de cocina (planificación **mensual** + vista mensual/semanal + ausencias + saldo) 🗓️👩‍🍳

**Duración:** 1 semana (5 días laborables)  
**Objetivo:** disponer de un módulo de **planificación mensual** de turnos para cocina, con:
- creación **mensual** del horario,
- **vista principal mensual** (y toggle a semanal),
- gestión de **ausencias** (vacaciones/bajas) y **saldo de vacaciones**,
- edición manual de turnos y validaciones básicas (sin motor avanzado todavía).

> Las **reglas avanzadas** (solo mañanas, rotaciones, finde libre, días libres consecutivos, cobertura por día) se implementan en Sprint 18-19 para mantener este sprint entregable y estable.

---

## 0) Contexto y dependencias
- Multi-tenant por `organization_id` + roles (COOK/AREA_MANAGER/ORG_ADMIN).
- `organization_members` para representar empleados.

---

## 1) Alcance del Sprint (MVP entregable)

### 1.1 Perfil de personal + contrato
**User story**
- Como *admin/manager*, configuro los miembros de cocina y su contrato (horas/semana, vacaciones/año, skills/estaciones).

**Incluye**
- Activar/desactivar personal.
- Habilidades/estaciones (p.ej. “frío”, “caliente”, “pase”).

---

### 1.2 Ausencias (vacaciones + bajas)
**User stories**
- Como *empleado*, solicito vacaciones (rango de fechas).
- Como *manager*, apruebo/deniego.
- Como *manager*, registro baja médica (retroactiva si hace falta).

**Tipos**
- `VACATION` (consume saldo)
- `SICK_LEAVE` (no consume saldo)
- `OTHER`

**Criterios**
- Una ausencia aprobada **bloquea asignaciones** de turnos en ese rango.
- Si ya había turnos, se marcan como **conflicto** hasta reasignar.

---

### 1.3 Saldo de vacaciones (y reflejo en calendario)
**Comportamiento**
- Por empleado y año:
  - `vacation_days_allocated`
  - `vacation_days_used`
  - `vacation_days_remaining`
- Al aprobar vacaciones:
  - calcula días consumidos (política configurable: *laborables* vs *naturales*),
  - descuenta saldo,
  - guarda auditoría.

**UI**
- Vista saldo por empleado.
- En el horario mensual, días de vacaciones aparecen como bloque “VAC”.
- Tooltip: tipo + fechas + saldo resultante.

---

### 1.4 Creación del horario **mensual**
**User stories**
- Como *manager*, creo el horario de un **mes** (borrador) y lo voy completando.
- Como *manager*, puedo **publicarlo** y bloquear (o versionar) cambios.

**Comportamiento**
- Entidad “Schedule Month”:
  - mes (YYYY-MM),
  - estado: `DRAFT` / `PUBLISHED`,
  - metadata: created_by, published_by, timestamps.
- Los turnos se asignan por día:
  - (fecha + tipo de turno + estación opcional),
  - asignaciones a empleados.

**Criterios**
- No se permiten asignaciones en días con ausencia aprobada (hard block).
- Detecta solapes en el mismo día (hard).
- Warnings por exceso de horas semanales (soft, por ahora).

---

### 1.5 Vista mensual (principal) + cambio a semanal
**Requisito del usuario**
- “Vista principal mensual y poder cambiar a semanal”.

**UX**
- Vista mensual tipo calendario:
  - cada día muestra chips por turno (M/T/N) y cobertura (p.ej. “M: 2/2”).
- Toggle:
  - **Mensual** (default),
  - **Semanal** (detalle con edición más cómoda).
- Edición de turnos:
  - click día → drawer/modal → crear/editar turno y asignaciones,
  - drag & drop opcional en vista semanal (si hay tiempo).

---

## 2) Cambios de datos (DB)

### 2.1 Tablas nuevas / ajustadas (mínimas)
**`staff_profiles`**
- id, organization_id, member_id (o user_id), role_in_kitchen, skills(json/array), active, created_at

**`staff_contracts`**
- id, staff_id
- weekly_hours_target
- max_weekly_hours
- vacation_days_per_year
- rest_min_hours_between_shifts (opcional)
- created_at, updated_at

**`staff_time_off`**
- id, staff_id
- type, start_date, end_date
- status (REQUESTED / APPROVED / REJECTED)
- counted_days (int)
- notes, created_by, approved_by, created_at

**`staff_vacation_balance`** (si preferimos separar por año)
- staff_id, year, days_allocated, days_used, days_remaining

**`schedule_months`**
- id, organization_id
- month (DATE con día 1, o YYYY-MM)
- status (DRAFT / PUBLISHED)
- created_by, published_by, created_at, published_at

**`shift_templates`**
- id, organization_id, name
- start_time, end_time
- shift_code (MORNING/AFTERNOON/NIGHT)
- station(optional)

**`shifts`**
- id, organization_id, schedule_month_id
- date, start_time, end_time
- shift_code
- station(optional)
- status (DRAFT / PUBLISHED)
- template_id (nullable)

**`shift_assignments`**
- shift_id, staff_id
- status (ASSIGNED / CONFIRMED / ABSENT)
- created_at

### 2.2 RLS
- COOK:
  - ver su horario,
  - crear solicitudes de vacaciones,
  - ver su saldo.
- Manager/Admin:
  - CRUD de turnos, aprobar vacaciones, ver todo el equipo.

---

## 3) Backend (API + servicios)

### 3.1 Endpoints (propuesta)
- Staff
  - `GET /api/v1/staff`
  - `POST /api/v1/staff`
  - `PATCH /api/v1/staff/:id`
  - `GET /api/v1/staff/:id/vacation-balance?year=YYYY`

- Time off
  - `POST /api/v1/time-off`
  - `PATCH /api/v1/time-off/:id/approve`
  - `PATCH /api/v1/time-off/:id/reject`

- Schedule mensual
  - `POST /api/v1/schedules/months` (crear borrador)
  - `GET /api/v1/schedules/months/:id` (mes + turnos + asignaciones)
  - `POST /api/v1/schedules/months/:id/publish`
  - `POST /api/v1/shifts` (crear turno en un día)
  - `PATCH /api/v1/shifts/:id` (editar horas / station / shift_code)
  - `PATCH /api/v1/shifts/:id/assignments` (asignar/quitar staff)

### 3.2 Servicios
- `VacationCalculatorService` (días consumidos según política)
- `ScheduleMonthService` (crear/publish, bloquear edición)
- `ScheduleValidationService` (solapes, conflictos con ausencias, horas semanales warning)

---

## 4) Frontend (UI)

### 4.1 Pantallas
- **Equipo (Staff)**: lista + contrato + skills + saldo vacaciones
- **Ausencias**: solicitudes + aprobación + calendario de ausencias
- **Horario**
  - Vista **mensual** (default) + toggle a semanal
  - Edición por día (modal/drawer)
  - Overlay de ausencias (VAC/BAJA)

### 4.2 Componentes
- `MonthScheduleCalendar`
- `WeekScheduleGrid`
- `ShiftEditorDrawer`
- `TimeOffRequestForm` / `TimeOffApprovalTable`

---

## 5) Plan de trabajo (día a día)

### DÍA 1 — DB + RLS + seeds
- Migraciones tablas staff/time_off/balance/schedule_months/shifts/assignments/templates.
- RLS por roles.
- Seed: plantillas básicas (mañana/tarde/noche).

### DÍA 2 — Backend Time off + saldo
- request/approve/reject.
- cálculo días + actualización saldo.
- tests unitarios (rangos con finde).

### DÍA 3 — Backend horario mensual
- crear schedule month, CRUD de shifts y assignments.
- validaciones: conflicto con ausencias, solapes.
- publish: marcar todo como PUBLISHED y bloquear cambios (o versionado simple).

### DÍA 4 — Frontend vista mensual + semanal
- calendario mensual con chips (M/T/N).
- toggle semanal.
- editor de turno por día.

### DÍA 5 — QA + E2E + docs
- E2E: solicitar vacaciones → aprobar → aparece VAC en mes → no permite asignar turno.
- Documentación de uso (crear mes, publicar, editar).

---

## 6) Definition of Done (DoD)
- ✅ Creación mensual y vista mensual por defecto, con toggle semanal.
- ✅ Turnos editables y asignaciones manuales.
- ✅ Ausencias bloquean asignaciones y aparecen en calendario.
- ✅ Saldo vacaciones se calcula, se descuenta al aprobar, y se visualiza.
- ✅ Tests básicos (unit + integration + ≥1 E2E).
