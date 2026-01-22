# SPRINT 20: Inventario v2 — Recuentos cíclicos + alertas de caducidad y stock 🔔📦

**Duración:** 1 semana (5 días laborables)  
**Objetivo:** cerrar el loop operativo del inventario (Sprint 15) con:
- **recuentos cíclicos** (cycle count) por ubicación/familia,
- ajuste auditado y conciliación,
- **alertas**: caducidad próxima, lote caducado, stock bajo,
- integración con el dashboard/notificaciones (si Sprint 08 existe).

---

## 1) Alcance

### 1.1 Recuento cíclico (cycle count)
**User stories**
- Como *encargado*, genero una lista de recuento por ubicación (“Cámara 1”) y la completo desde móvil.
- El sistema calcula diferencias vs stock actual (por lotes) y propone ajustes.

**Criterios**
- Ajustes generan `stock_movements` tipo `ADJUSTMENT` con motivo + auditoría.
- Reporte de discrepancias por ingrediente y ubicación.

---

### 1.2 Alertas de caducidad y stock
**Comportamiento**
- Job diario (cron/edge function):
  - lotes que caducan en X días,
  - lotes caducados,
  - ingredientes por debajo de stock mínimo.
- Crea notificaciones internas y/o emails (si existe módulo).

---

## 2) Modelo de datos

### 2.1 Tablas nuevas
**`cycle_counts`**
- id, organization_id
- name, location_id (nullable)
- status (DRAFT/IN_PROGRESS/COMPLETED)
- created_by, created_at, completed_at

**`cycle_count_items`**
- cycle_count_id
- ingredient_id
- batch_id (nullable)  *(si contamos por lote)*
- expected_qty
- counted_qty
- unit_id
- variance_qty
- notes

**`inventory_alerts`**
- id, organization_id
- type (EXPIRING_SOON/EXPIRED/LOW_STOCK)
- entity_type (BATCH/INGREDIENT/PREPARATION_BATCH)
- entity_id
- severity (INFO/WARN/CRITICAL)
- created_at, resolved_at, resolved_by

---

## 3) Backend

### 3.1 Endpoints
- `POST /api/v1/inventory/cycle-counts`
- `GET /api/v1/inventory/cycle-counts/:id`
- `PATCH /api/v1/inventory/cycle-counts/:id/items` (guardar conteos)
- `POST /api/v1/inventory/cycle-counts/:id/complete` (crea ajustes)

- `GET /api/v1/inventory/alerts`
- `PATCH /api/v1/inventory/alerts/:id/resolve`

### 3.2 Servicios
- `CycleCountService` (crear, completar, ajustes)
- `InventoryAlertsJob` (expiring/expired/low-stock)

---

## 4) Frontend

### 4.1 Pantallas
- **Inventario → Recuentos**
  - crear recuento, completar desde móvil, ver discrepancias
- **Dashboard → Alertas**
  - lista priorizada + filtros + resolver

---

## 5) Definition of Done (DoD)
- ✅ Recuento cíclico operativo con ajuste auditado.
- ✅ Alertas por caducidad y stock bajo, visibles y resolubles.
- ✅ Tests de integración para completar recuento y generar movimientos.
