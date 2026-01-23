# SPRINT 19: Horarios v3 — Generación automática mensual + cobertura por día 📈🗓️

**Duración:** 1 semana (5 días laborables)  
**Objetivo:** automatizar la **generación mensual** del horario con:
- requisitos de **cobertura por día y turno**,
- respeto de ausencias, contratos y reglas (Sprint 16 + 18),
- capacidad de regenerar y mantener ediciones manuales.

---

## 1) Alcance

### 1.1 Reglas de cobertura
**Comportamiento**
- Cobertura mínima por día de semana y turno.
- Overrides por fecha (festivos/eventos).

**Default actual (si no hay reglas guardadas)**
- Viernes y sábado:
  - Mañana = 2
  - Tarde = 1
- Resto de días:
  - Mañana = 1
  - Tarde = 1

---

### 1.2 Generación automática (heurística)
**Reglas aplicadas**
- Respeta ausencias.
- Respeta `allowed_shift_codes` por empleado (solo mañanas / rotativo).
- **Fin de semana libre**: intenta asignar 1 sábado+domingo libre por empleado.
- **Descanso**: evita mañana si el día anterior fue tarde (si hay alternativa).
- Balancea asignaciones por volumen de turnos.

**Salida**
- Crea turnos y asignaciones en estado `DRAFT`.
- Devuelve warnings cuando no se cumple cobertura o se relajan reglas.

---

## 2) Backend

### 2.1 Endpoint
- `POST /api/v1/schedules/months/:id/generate`

### 2.2 Servicios
- `ScheduleGeneratorService`
- `ScheduleCoverageService`

---

## 3) Frontend

### 3.1 UI
- Botón **“Generar mes”** en Horario.
- Mensaje de resultado y warnings.

---

## 4) Definition of Done (DoD)
- ✅ Generación mensual con cobertura por día/turno.
- ✅ Respeta reglas básicas y ausencias.
- ✅ Warnings claros cuando falta personal.
