## Debug log (desde el ultimo commit/push)

Fecha: 2026-01-23

### Incidencias reportadas
- Frontend: `Invalid hook call` en `App.tsx` (Zustand `useAuthStore`) y errores `useRef` null; posible duplicado React/HMR roto.
- Frontend: warning "Select is changing from uncontrolled to controlled".
- Frontend: eventos `PATCH /api/v1/events/:id` 500 (Internal Server Error) al editar/crear.
- Backend: `EADDRINUSE` en puerto 3001 al levantar (proceso duplicado).
- Backend: `PGRST204` "Could not find the 'contact_email' column of 'staff_profiles'" al crear staff profile.
- Import eventos: 0 importados, 698 errores por columna `location` no en schema cache (resuelto al migrar).
- Import ingredientes (CSV): errores por `getImportBuffer` undefined (controlador/servicio).
- Import ocupacion: errores por `parse_date_code` undefined y `organization_id` null en `daily_service_counts`.
- Inventory vacio en UI tras seed/reset (posible auth/org mismatch o cache).
- Schedule: `validate`/`publish` 429 por multiples requests.

### Estado actual (segun ultima sesion)
- Base local reseteada con `supabase db reset`.
- Seed local ejecutado con `backend/scripts/seed-local.ts`.
- Login funciona con `admin@local.test` (password `admin123`).
- Backend levantado en `http://localhost:3001/api/v1`.

### Pendiente de revisar
- Confirmar causa exacta del `Invalid hook call` y resolver.
- Revisar errores 500 en eventos (backend logs).
- Revisar endpoints staff profiles y columnas esperadas.
- Verificar inventario con datos semilla (UI).

Fecha: 2026-01-25

### Incidencias reportadas
- Backend: `PGRST205` "Could not find the table 'public.schedule_day_requirements' in the schema cache" desde schedule coverage endpoints.

### Evidencia
- `supabase db dump --local --schema public` no contiene `schedule_day_requirements`.
- `supabase db dump --local --schema supabase_migrations --data-only` no contiene version `20260128000001`.

### Notas
- Servicio: `ScheduleCoverageService.getCoverageRules`.
- Logs: `backend_dev.log` en 2026-01-23 10:44.
- Supabase CLI local no soporta `supabase db query`; se uso `db dump`.
