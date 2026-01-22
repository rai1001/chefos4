ARQUITECTURA COMPLETA CULINARYOS MVP
Voy a crear una estructura de proyecto profesional, lista para desarrollo autónomo con IA, Supabase y Vercel.# SCRIPT COMPLETO - CULINARYOS MVP 1 + MVP 2
# Ejecutar en PowerShell desde la carpeta donde quieres crear el proyecto


# Crear carpeta raíz
New-Item -ItemType Directory -Path "culinaryos-mvp" -Force
Set-Location "culinaryos-mvp"


# ============================================
# DOCUMENTACIÓN
# ============================================
New-Item -ItemType Directory -Path "docs\sprints" -Force


# ============================================
# SUPABASE
# ============================================
New-Item -ItemType Directory -Path "supabase\migrations" -Force
New-Item -ItemType Directory -Path "supabase\functions\calculate-purchase-order" -Force
New-Item -ItemType Directory -Path "supabase\functions\estimate-delivery-date" -Force
New-Item -ItemType Directory -Path "supabase\functions\import-csv" -Force
New-Item -ItemType Directory -Path "supabase\seed" -Force


# ============================================
# BACKEND (Node.js API)
# ============================================
# Estructura principal
New-Item -ItemType Directory -Path "backend\src\config" -Force
New-Item -ItemType Directory -Path "backend\src\middleware" -Force
New-Item -ItemType Directory -Path "backend\src\routes" -Force
New-Item -ItemType Directory -Path "backend\src\controllers" -Force
New-Item -ItemType Directory -Path "backend\src\services" -Force
New-Item -ItemType Directory -Path "backend\src\utils" -Force
New-Item -ItemType Directory -Path "backend\src\types" -Force
New-Item -ItemType Directory -Path "backend\src\workers" -Force


# Tests
New-Item -ItemType Directory -Path "backend\tests\unit" -Force
New-Item -ItemType Directory -Path "backend\tests\integration" -Force


# ============================================
# FRONTEND (React + TypeScript)
# ============================================
# Configuración
New-Item -ItemType Directory -Path "frontend\public" -Force
New-Item -ItemType Directory -Path "frontend\src\config" -Force
New-Item -ItemType Directory -Path "frontend\src\lib" -Force
New-Item -ItemType Directory -Path "frontend\src\types" -Force


# Hooks
New-Item -ItemType Directory -Path "frontend\src\hooks" -Force


# Stores (Zustand)
New-Item -ItemType Directory -Path "frontend\src\stores" -Force


# Services
New-Item -ItemType Directory -Path "frontend\src\services" -Force


# Components - UI Base (Shadcn)
New-Item -ItemType Directory -Path "frontend\src\components\ui" -Force


# Components - Layout
New-Item -ItemType Directory -Path "frontend\src\components\layout" -Force


# Components - Auth
New-Item -ItemType Directory -Path "frontend\src\components\auth" -Force


# Components - Dashboard (MVP1)
New-Item -ItemType Directory -Path "frontend\src\components\dashboard" -Force


# Components - Ingredientes (MVP1)
New-Item -ItemType Directory -Path "frontend\src\components\ingredients" -Force


# Components - Proveedores (MVP1)
New-Item -ItemType Directory -Path "frontend\src\components\suppliers" -Force


# Components - Eventos (MVP1)
New-Item -ItemType Directory -Path "frontend\src\components\events" -Force


# Components - Recetas (MVP1)
New-Item -ItemType Directory -Path "frontend\src\components\recipes" -Force


# Components - Purchase Orders (MVP1)
New-Item -ItemType Directory -Path "frontend\src\components\purchase-orders" -Force


# Components - Kitchen Mode (MVP1)
New-Item -ItemType Directory -Path "frontend\src\components\kitchen" -Force


# ============================================
# MVP 2.0 - NUEVAS FEATURES
# ============================================


# Analytics & Reporting (Sprint 07)
New-Item -ItemType Directory -Path "frontend\src\components\analytics" -Force


# Notificaciones (Sprint 08)
New-Item -ItemType Directory -Path "frontend\src\components\notifications" -Force


# OCR & Delivery Notes (Sprint 09)
New-Item -ItemType Directory -Path "frontend\src\components\delivery-notes" -Force


# Planificación & Gantt (Sprint 10)
New-Item -ItemType Directory -Path "frontend\src\components\production" -Force


# Reportes PDF/Excel (Sprint 11)
New-Item -ItemType Directory -Path "frontend\src\components\reports" -Force


# Gestión de Mermas (Sprint 12)
New-Item -ItemType Directory -Path "frontend\src\components\waste" -Force


# Webhooks (Sprint 13)
New-Item -ItemType Directory -Path "frontend\src\components\webhooks" -Force


# Permisos Granulares (Sprint 14)
New-Item -ItemType Directory -Path "frontend\src\components\permissions" -Force


# Pages
New-Item -ItemType Directory -Path "frontend\src\pages\auth" -Force


# Routes
New-Item -ItemType Directory -Path "frontend\src\routes" -Force


# Styles
New-Item -ItemType Directory -Path "frontend\src\styles" -Force


# Tests
New-Item -ItemType Directory -Path "frontend\tests\unit\components" -Force
New-Item -ItemType Directory -Path "frontend\tests\e2e" -Force


# ============================================
# GITHUB ACTIONS (CI/CD)
# ============================================
New-Item -ItemType Directory -Path ".github\workflows" -Force


# ============================================
# VSCODE
# ============================================
New-Item -ItemType Directory -Path ".vscode" -Force


# ============================================
# HUSKY (Git Hooks)
# ============================================
New-Item -ItemType Directory -Path ".husky" -Force


# ============================================
# SKILLS (Opcional - para AI)
# ============================================
New-Item -ItemType Directory -Path "mnt\skills\public\docx" -Force
New-Item -ItemType Directory -Path "mnt\skills\public\pdf" -Force
New-Item -ItemType Directory -Path "mnt\skills\public\pptx" -Force
New-Item -ItemType Directory -Path "mnt\skills\public\xlsx" -Force
New-Item -ItemType Directory -Path "mnt\skills\examples" -Force


Write-Host "✅ Estructura completa creada!" -ForegroundColor Green
Write-Host "📂 Total de carpetas creadas: " -NoNewline
$folderCount = (Get-ChildItem -Recurse -Directory | Measure-Object).Count
Write-Host $folderCount -ForegroundColor Cyan


Write-Host "`n📋 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "1. cd culinaryos-mvp"
Write-Host "2. Descargar los archivos que te voy a generar"
Write-Host "3. Copiar cada archivo a su carpeta correspondiente"
Write-Host "4. npm install en backend/ y frontend/"
Write-Host "5. Configurar .env en ambos"
Write-Host "6. supabase start"
Write-Host "7. npm run dev"
