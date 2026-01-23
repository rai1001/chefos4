# SPRINT 17: Preparaciones (producción interna) + Etiquetas (lote/caducidad) 🏷️🥣

**Duración:** 1 semana (5 días laborables)  
**Objetivo:** crear una **categoría nueva “Preparaciones”** para gestionar productos preparados internamente (salsas, caldos, mise en place), con:
- creación de **lotes de preparación** (batch),
- control de **caducidad** y trazabilidad,
- **impresión de etiquetas** (lote + caducidad + QR/Barcode),
- integración con **inventario** para controlar fechas y stock de preparación.

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

### 1.1 Lote de preparación (flujo simplificado)
**User stories**
- Como *cocinero*, creo un lote de preparación indicando:
  - nombre, unidad, fecha de producción, cantidad, caducidad, ubicación y lote (opcional).
- Como *manager*, puedo importar una preparación desde receta o restos de evento (referencia).

**Criterios**
- No requiere catálogo ni receta obligatoria.
- Se genera una etiqueta y se integra en inventario con su caducidad.

---

### 1.2 Integración con inventario
**Comportamiento**
- Cada lote crea un **ingrediente de preparación** (si no existe) y un **lote de inventario**.
- El stock y la caducidad de la preparación se gestionan desde inventario.

**Criterios**
- `ingredients.is_preparation=true` y vínculo a `preparations`.
- `preparation_batches.inventory_batch_id` enlaza al lote creado en inventario.

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

### 1.4 Escaneo de caducidad por imagen (opcional)
- Reusar `ExpiryOCRService` para:
  - leer etiqueta ya impresa o etiqueta del recipiente,
  - proponer caducidad,
  - confirmar y actualizar lote.

---

## 2) Modelo de datos (DB)

### 2.1 Tablas clave
**`preparations`**
- id, organization_id
- name, unit_id, notes (opcionales)

**`preparation_batches`**
- id, organization_id, preparation_id
- produced_at, quantity_produced, quantity_current
- expiry_date, lot_code
- storage_location_id (nullable)
- inventory_batch_id (nullable)
- created_by, created_at

**`ingredients` (nuevos campos)**
- `is_preparation` boolean
- `preparation_id` nullable

---

## 3) Backend (API + servicios)

### 3.1 Endpoints
- `GET /api/v1/preparations`
- `POST /api/v1/preparations`
- `PATCH /api/v1/preparations/:id`

-- `POST /api/v1/preparations/batches/simple`
  - crea lote simple y registra en inventario

- `GET /api/v1/preparations/batches?expiring_in_days=&location_id=`
- `PATCH /api/v1/preparations/batches/:id` (caducidad, ubicación, ajuste cantidad)

- `POST /api/v1/preparations/batches/:id/labels/print` (PDF)
- `POST /api/v1/preparations/batches/:id/expiry/scan` (OCR → candidatos)

### 3.2 Servicios
- `PreparationBatchService` (crear lote simple, integrar inventario)
- `PreparationLabelService` (generación PDF etiquetas)
- Reuso: `ExpiryOCRService`

---

## 4) Frontend (UI)

### 4.1 Pantallas
- **Preparaciones**
  - crear lote simple (nombre, unidad, cantidad, fechas)
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

### DÍA 2 — Backend lote + inventario
- Crear lote simple, crear lote en inventario con caducidad.
- Tests integración: lote crea batch en inventario.

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
