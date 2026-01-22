# SPRINT 15: Inventario conectado (Albaranes + Lotes/Caducidades por imagen + Salidas por código de barras) 📦

**Duración:** 1 semana (5 días laborables)  
**Objetivo:** convertir el inventario en un flujo “end-to-end”: **recepción por albarán → stock por lotes con caducidad → salidas por escaneo**, con trazabilidad en movimientos y conectado con compras/producción/mermas.

> Nota: la **impresión de etiquetas (lote + caducidad)** se mueve a una **categoría nueva “Preparaciones”** (Sprint 17) para centralizar el control de fechas (prep + lotes) sin mezclarlo en el inventario base.

---

## 0) Contexto y dependencias (lo que ya existe)
Este sprint se apoya en módulos ya descritos:

- **Recepción / OCR de albaranes** (`delivery_notes`, `delivery_note_items`, conciliación).
- **Ingredientes con `barcode`** (identificación al escanear).
- **Movimientos de stock** (`stock_movements`) con referencias opcionales a compras y producción.
- **RLS multi-tenant** por `organization_id` y roles (COOK/AREA_MANAGER/ORG_ADMIN).

---

## 1) Alcance del Sprint (MVP entregable)

### 1.1 Importar artículos por albarán (conectado a compras)
**User stories**
- Como *encargado*, subo un albarán (foto/PDF) y el sistema extrae líneas y cantidades.
- Como *encargado*, puedo **mapear** cada línea del albarán a un ingrediente existente o **crear** un ingrediente nuevo (unidad + proveedor + barcode opcional).
- Como *encargado*, al **aprobar la recepción** el sistema:
  1) actualiza `purchase_order_items.quantity_received` (si hay PO asociada),
  2) incrementa stock,
  3) crea **lotes (batches)** para permitir caducidades/trazabilidad.

**Criterios de aceptación**
- Flujo guiado: *OCR → revisión → conciliación → aprobación → stock actualizado*.
- Líneas no reconocidas obligan a resolver: (crear ingrediente / vincular / ignorar).
- Auditoría: quién aprobó, cuándo y qué se importó.

---

### 1.2 Lotes (batch) + caducidades (sin romper `ingredients.stock_current`)
**Objetivo:** stock con caducidad y trazabilidad, manteniendo compatibilidad con el stock actual.

**Comportamiento**
- Cada recepción crea uno o más **lotes** por ingrediente:
  - `quantity_received`, `quantity_current`, `expiry_date`, `lot_code` (opcional), `received_at`.
- Política **FEFO** (First-Expired, First-Out) para consumos:
  - al dar salida, se descuentan primero los lotes con caducidad más próxima.
- Pantalla de **Caducidades**:
  - lista de lotes con filtros: próximos a caducar, caducados, por ubicación, por proveedor.

**Criterios de aceptación**
- FEFO consistente y testeado (consume lotes en orden y nunca deja stock negativo).
- `ingredients.stock_current` siempre coincide con la suma de `inventory_batches.quantity_current`.

---

### 1.3 Caducidades por imagen (OCR de etiqueta)
**User story**
- Como *cocinero/encargado*, saco una foto a la etiqueta del producto/lote y el sistema propone una fecha de caducidad.

**Comportamiento**
- Endpoint para subir imagen asociada a un lote (o a una línea de albarán para crear lote “pendiente”).
- Servicio OCR especializado:
  - detecta texto,
  - extrae candidatos de fecha (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, mm/yyyy),
  - devuelve **candidatos ordenados** por confianza.
- UI de confirmación: el usuario **confirma/corrige** antes de guardar.

**Criterios de aceptación**
- Soporta formatos ES (dd/mm/yyyy) y normaliza a ISO.
- Si no detecta fecha, input manual en 1 paso.

---

### 1.4 Salidas de almacén con código de barras
**User stories**
- Como *cocinero*, escaneo un **código de barras** (EAN/UPC) y registro una salida (consumo/merma/ajuste).
- Como *encargado*, puedo asociar la salida a una **orden de producción** o una **merma**.

**Comportamiento**
- Escaneo en móvil + cantidad + motivo.
- Resolver el código:
  - buscar `ingredients.barcode`,
  - si no existe, permitir “buscar ingrediente” manual y **guardar ese barcode**.
- Descontar stock usando **FEFO** y registrar en:
  - `stock_movements` (`OUT` / `WASTE` / `ADJUSTMENT`, `notes`, `production_order_id` opcional),
  - tabla de enlace `stock_movement_batches` (trazabilidad por lote).

**Criterios de aceptación**
- Escaneo + salida completa ≤ 10s en móvil.
- Cada salida crea movimiento y actualiza stock en tiempo real.

---

## 2) Funcionalidad extra incluida (sin romper el modelo actual)

### 2.1 Ubicaciones de almacén (multi-ubicación ligera)
- Tabla `storage_locations` (“Cámara 1”, “Congelador”, “Seco - Estantería A”).
- Cada lote se asigna a una ubicación.
- En salidas, el sistema sugiere ubicación del lote a consumir (FEFO + ubicación).

---

## 3) Cambios de datos (DB)

### 3.1 Nuevas tablas
**`inventory_batches`**
- id (uuid)
- organization_id
- ingredient_id
- unit_id
- quantity_received
- quantity_current
- received_at
- expiry_date (nullable)
- lot_code (nullable)
- delivery_note_item_id (nullable)
- storage_location_id (nullable)
- created_by (user_id nullable)
- created_at

**`storage_locations`**
- id, organization_id, name, type(optional), created_at

**`stock_movement_batches`**
- movement_id, batch_id, quantity

### 3.2 RPC / funciones SQL recomendadas
- `create_inventory_batch(...)` → inserta lote + incrementa `ingredients.stock_current` + movimiento IN.
- `consume_inventory_fefo(...)` → descuenta lotes FEFO + decrementa `ingredients.stock_current`.
- `adjust_inventory_from_cycle_count(...)` → (preparado para Sprint 20) ajuste con auditoría.

### 3.3 RLS
- COOK:
  - SELECT lotes/ubicaciones,
  - INSERT movimientos,
  - UPDATE lotes solo para `expiry_date`/`storage_location_id` (según rol).
- Manager/Admin:
  - CRUD completo.

---

## 4) Backend (API + servicios)

### 4.1 Endpoints (propuesta)
- `POST /api/v1/delivery-notes/:id/import-to-inventory`
- `GET /api/v1/inventory/batches?ingredient_id=&expiring_in_days=&location_id=`
- `PATCH /api/v1/inventory/batches/:id` (editar caducidad, ubicación, lote)
- `POST /api/v1/inventory/batches/:id/expiry/scan` (subir imagen → candidatos)
- `POST /api/v1/inventory/stock-out` (barcode|ingredient_id, qty, motivo, production_order_id?)

### 4.2 Servicios
- `DeliveryNoteImportService` (mapea líneas OCR → ingredientes y crea lotes)
- `ExpiryOCRService` (OCR etiqueta + extractor de fechas)
- `BatchConsumptionService` (FEFO + trazabilidad)
- `BarcodeResolverService` (barcode → ingrediente + “guardar barcode” si falta)

---

## 5) Frontend (UI)

### 5.1 Pantallas
- **Inventario → Recepción** (albaranes OCR + “Importar a inventario” + resolver líneas)
- **Inventario → Caducidades** (lotes + filtros + editar + “Escanear caducidad”)
- **Inventario → Salidas** (modo escáner + cantidad + motivo)
- **Inventario → Ubicaciones** (CRUD simple)

### 5.2 Componentes
- `BarcodeScanner` (webcam/cámara, soportando EAN/UPC)
- `ExpiryScanCapture` (captura imagen + confirmación de fecha)
- `UnmatchedLinesResolver` (wizard mapear líneas → ingredientes)

---

## 6) Plan de trabajo (día a día)

### DÍA 1 — DB y contratos de API
- Migraciones: `inventory_batches`, `storage_locations`, `stock_movement_batches`.
- RPC FEFO (consume + create batch).
- RLS + índices (org_id, ingredient_id, expiry_date, location_id).
- Contratos OpenAPI/colección Postman.

### DÍA 2 — Importación por albarán (backend)
- Importación al aprobar albarán → lotes + movimientos + actualización PO.
- API devuelve `unmatched_items` para resolver.
- Tests integración: importación con 3 ingredientes y 1 desconocido.

### DÍA 3 — OCR de caducidades (backend)
- OCR + extractor fechas + normalización.
- Endpoint scan + confirmación.
- Tests unitarios del parser (dd/mm/yyyy, mm/yyyy, texto ruidoso).

### DÍA 4 — Frontend (recepción + caducidades + salidas)
- UI recepción: importar y resolver líneas.
- UI caducidades: lista + escaneo + edición.
- UI salidas: scanner + salida FEFO + feedback.

### DÍA 5 — QA, E2E y docs
- E2E: OCR albarán → importar → escanear caducidad → salida por barcode.
- Performance: índices + paginación lotes.
- Docs de uso (barcodes duplicados, OCR ambiguo, FEFO).

---

## 7) Definition of Done (DoD)
- ✅ Importación por albarán crea lotes y actualiza stock y compras.
- ✅ Caducidad por imagen funciona con confirmación manual.
- ✅ Salidas por barcode registran movimientos y consumen FEFO por lotes.
- ✅ RLS aplicada y tests verdes (unit + integration + ≥1 E2E).
- ✅ UI móvil usable (recepción/escaneo/salida).
