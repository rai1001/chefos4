# SPRINT 17: Preparaciones (producción interna) + Etiquetas (lote/caducidad) 🏷️🥣

**Duración:** 1 semana (5 días laborables)  
**Objetivo:** crear una **categoría nueva “Preparaciones”** para gestionar productos preparados internamente (salsas, caldos, mise en place), con:
- creación de **lotes de preparación** (batch),
- control de **caducidad** y trazabilidad,
- **impresión de etiquetas** (lote + caducidad + QR/Barcode),
- integración con **inventario por lotes** (Sprint 15) para consumir ingredientes FEFO y generar stock de preparación.

---

## 0) Por qué va en “Preparaciones” (y no en Inventario)
- El inventario gestiona **entradas/salidas** de ingredientes.
- “Preparaciones” gestiona **producción interna** (transformación) y necesita:
  - lote propio,
  - caducidad propia,
  - etiquetas por porción/recipiente,
  - trazabilidad ingrediente → preparación.

---

## 1) Alcance del Sprint (MVP entregable)

### 1.1 Catálogo de preparaciones
**User stories**
- Como *manager*, creo una preparación (p.ej. “Salsa demi-glace”) con:
  - nombre, estación, unidad de stock (l/ud/kg), caducidad por defecto (días), notas.
- Como *cocinero*, veo el catálogo y puedo iniciar un lote.

**Criterios**
- CRUD básico (admin/manager).
- Visible para COOK (solo lectura + crear lote).

---

### 1.2 Lotes de preparación (batches) + consumo de ingredientes
**User stories**
- Como *cocinero*, creo un lote de preparación:
  - fecha, cantidad producida, caducidad (autopropuesta), ubicación.
- El sistema descuenta ingredientes usados del inventario con **FEFO** (Sprint 15).
- El lote queda disponible como stock interno (para usos posteriores y control).

**Criterios**
- El consumo genera `stock_movements` de salida (ingredientes) y mantiene trazabilidad:
  - qué lotes de ingredientes se consumieron para este lote de preparación.
- El lote de preparación guarda `lot_code` y `expiry_date`.

---

### 1.3 Impresión de etiquetas (lote + caducidad)
**Requisito clave del usuario**
- “Impresión de etiquetas lote caducidad” dentro de Preparaciones.

**Comportamiento**
- Desde un lote de preparación:
  - elegir formato (1 etiqueta / varias por porciones),
  - imprimir PDF con: nombre, lote, caducidad, fecha producción, QR/Barcode.
- QR/Barcode codifica un identificador (p.ej. `prep_batch:<id>`).

**Criterios**
- PDF A4 con rejilla (compatibles con etiquetas estándar).
- Plantillas de etiqueta configurables (texto grande/pequeño).

---

### 1.4 Escaneo de caducidad por imagen (reutiliza Sprint 15)
- Reusar `ExpiryOCRService` para:
  - leer etiqueta ya impresa o etiqueta del recipiente,
  - proponer caducidad,
  - confirmar y actualizar lote.

---

## 2) Modelo de datos (DB)

### 2.1 Nuevas tablas
**`preparations`**
- id, organization_id
- name, default_shelf_life_days (int)
- unit_id
- station(optional), notes
- active, created_at

**`preparation_batches`**
- id, organization_id, preparation_id
- produced_at, quantity_produced, quantity_current
- expiry_date, lot_code
- storage_location_id (nullable)
- created_by, created_at

**`preparation_batch_ingredients`**
- preparation_batch_id
- ingredient_id
- quantity_used
- unit_id
- (opcional) link a `stock_movement_batches`/lotes consumidos para trazabilidad fina

**(Opcional, si se quiere inventario común)**
- `inventory_batches` puede ampliarse con `source_type` (INGREDIENT/PREPARATION) o mantener separado.

---

## 3) Backend (API + servicios)

### 3.1 Endpoints
- `GET /api/v1/preparations`
- `POST /api/v1/preparations`
- `PATCH /api/v1/preparations/:id`

- `POST /api/v1/preparations/:id/batches`
  - crea lote + descuenta ingredientes (FEFO) + registra movimientos

- `GET /api/v1/preparations/batches?expiring_in_days=&location_id=`
- `PATCH /api/v1/preparations/batches/:id` (caducidad, ubicación, ajuste cantidad)

- `POST /api/v1/preparations/batches/:id/labels/print` (PDF)
- `POST /api/v1/preparations/batches/:id/expiry/scan` (OCR → candidatos)

### 3.2 Servicios
- `PreparationBatchService` (crear lote, consumir ingredientes, ajustar stock)
- `PreparationLabelService` (generación PDF etiquetas)
- Reuso: `BatchConsumptionService` + `ExpiryOCRService`

---

## 4) Frontend (UI)

### 4.1 Pantallas
- **Preparaciones → Catálogo** (lista + crear/editar)
- **Preparaciones → Lotes**
  - crear lote (wizard: cantidad, receta/ingredientes usados, caducidad, ubicación)
  - imprimir etiquetas
  - lista de lotes + filtros por caducidad

### 4.2 Flujos clave
- Crear lote → imprime etiquetas → lote aparece en lista de caducidades (preparaciones)
- Escanear etiqueta (QR) → abre lote → ajustar caducidad/cantidad

---

## 5) Plan de trabajo

### DÍA 1 — DB + contratos
- Migraciones `preparations`, `preparation_batches`, `preparation_batch_ingredients`.
- Índices (org, expiry_date, preparation_id).
- RLS.

### DÍA 2 — Backend lote + consumo FEFO
- Crear lote, descontar ingredientes con FEFO, registrar movimientos.
- Tests integración: lote consume 2 ingredientes de 2 lotes distintos.

### DÍA 3 — Etiquetas PDF + QR/Barcode
- Servicio PDF etiquetas (A4 grid).
- Endpoint print.
- Tests smoke de generación.

### DÍA 4 — Frontend catálogo + lotes + impresión
- UI catálogo y wizard de lote.
- Botón imprimir etiquetas.

### DÍA 5 — QA + E2E
- E2E: crear lote → imprimir → listar → escanear caducidad por imagen (opcional).
- Docs de operación (cómo pegar etiquetas, tamaños).

---

## 6) Definition of Done (DoD)
- ✅ Catálogo de preparaciones y lotes funcional.
- ✅ Lotes descuentan ingredientes por FEFO y dejan trazabilidad.
- ✅ Impresión de etiquetas (PDF) con lote/caducidad y QR/Barcode.
- ✅ UI usable en cocina (móvil/tablet).
