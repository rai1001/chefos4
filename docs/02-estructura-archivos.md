🗂️ ESTRUCTURA DE ARCHIVOS COMPLETA
culinaryos-mvp/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Tests automáticos en PR
│       └── deploy.yml                # Deploy a Vercel
│
├── docs/
│   ├── README.md                     # Portada del proyecto
│   ├── ARCHITECTURE.md               # Decisiones técnicas
│   ├── API.md                        # Documentación de endpoints
│   ├── DATABASE.md                   # Schema y migraciones
│   ├── BUSINESS_RULES.md             # Lógica de dominio
│   ├── ROADMAP.md                    # Fases del proyecto
│   └── sprints/
│       ├── sprint-01-auth.md
│       ├── sprint-02-ingredients.md
│       ├── sprint-03-suppliers.md
│       └── ...
│
├── supabase/
│   ├── config.toml                   # Configuración local
│   ├── seed.sql                      # Datos iniciales
│   ├── migrations/
│   │   ├── 20250121000001_initial_schema.sql
│   │   ├── 20250121000002_auth_tables.sql
│   │   ├── 20250121000003_product_families.sql
│   │   ├── 20250121000004_suppliers.sql
│   │   ├── 20250121000005_ingredients.sql
│   │   ├── 20250121000006_units_conversions.sql
│   │   ├── 20250121000007_events.sql
│   │   ├── 20250121000008_recipes.sql
│   │   ├── 20250121000009_purchase_orders.sql
│   │   └── 20250121000010_rls_policies.sql
│   │
│   └── functions/
│       ├── calculate-purchase-order/
│       │   ├── index.ts              # Lógica de Safety Buffer
│       │   └── test.ts
│       ├── estimate-delivery-date/
│       │   ├── index.ts              # Algoritmo Lead Time
│       │   └── test.ts
│       └── import-csv/
│           ├── index.ts              # Procesamiento CSV/Excel
│           └── test.ts
│
├── backend/                          # API Node.js (opcional, si necesitas lógica custom)
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   │   ├── supabase.ts
│   │   │   └── env.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── ingredients.routes.ts
│   │   │   ├── suppliers.routes.ts
│   │   │   ├── events.routes.ts
│   │   │   └── purchase-orders.routes.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── ingredients.controller.ts
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── purchase-calculator.service.ts
│   │   │   ├── delivery-estimator.service.ts
│   │   │   ├── csv-importer.service.ts
│   │   │   └── ...
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── date-helpers.ts
│   │   │   └── validators.ts
│   │   └── types/
│   │       ├── database.types.ts     # Generado por Supabase CLI
│   │       └── api.types.ts
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── purchase-calculator.test.ts
│   │   │   └── delivery-estimator.test.ts
│   │   └── integration/
│   │       ├── auth.test.ts
│   │       └── ingredients.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── vitest.config.ts
│
├── frontend/
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── beep.mp3                  # Sonido para escáner
│   │   └── robots.txt
│   │
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── vite-env.d.ts
│   │   │
│   │   ├── config/
│   │   │   ├── supabase.ts
│   │   │   └── constants.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── utils.ts
│   │   │   └── cn.ts                 # Tailwind merge
│   │   │
│   │   ├── types/
│   │   │   ├── database.types.ts     # Generado por Supabase
│   │   │   ├── models.ts
│   │   │   └── api.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useSuppliers.ts
│   │   │   ├── useIngredients.ts
│   │   │   ├── useEvents.ts
│   │   │   └── useScanner.ts         # Para html5-qrcode
│   │   │
│   │   ├── stores/
│   │   │   ├── authStore.ts          # Zustand
│   │   │   └── uiStore.ts
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts                # Axios instance
│   │   │   ├── auth.service.ts
│   │   │   ├── ingredients.service.ts
│   │   │   └── ...
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                   # Shadcn components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── modal.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── MobileNav.tsx
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── SupplierCountdown.tsx   # Widget ⏳
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   └── RecentActivity.tsx
│   │   │   │
│   │   │   ├── ingredients/
│   │   │   │   ├── IngredientsList.tsx
│   │   │   │   ├── IngredientForm.tsx
│   │   │   │   └── CSVImportWizard.tsx     # Wizard de importación
│   │   │   │
│   │   │   ├── suppliers/
│   │   │   │   ├── SuppliersList.tsx
│   │   │   │   ├── SupplierForm.tsx
│   │   │   │   └── DeliverySchedule.tsx
│   │   │   │
│   │   │   ├── events/
│   │   │   │   ├── EventCalendar.tsx
│   │   │   │   ├── EventForm.tsx
│   │   │   │   ├── EventMenuBuilder.tsx
│   │   │   │   └── DirectIngredientInput.tsx  # Para SPORTS_MULTI
│   │   │   │
│   │   │   ├── purchase-orders/
│   │   │   │   ├── POList.tsx
│   │   │   │   ├── POForm.tsx
│   │   │   │   └── POPreview.tsx
│   │   │   │
│   │   │   └── kitchen/
│   │   │       ├── TaskList.tsx             # Staff Mode
│   │   │       ├── QuickScanner.tsx         # Escáner QR
│   │   │       └── StockOut.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Ingredients.tsx
│   │   │   ├── Suppliers.tsx
│   │   │   ├── Events.tsx
│   │   │   ├── PurchaseOrders.tsx
│   │   │   ├── Kitchen.tsx                  # Staff Mode
│   │   │   └── Settings.tsx
│   │   │
│   │   ├── routes/
│   │   │   ├── index.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── RoleGuard.tsx                # Middleware de roles
│   │   │
│   │   └── styles/
│   │       ├── globals.css
│   │       └── tailwind.css
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   └── components/
│   │   └── e2e/
│   │       ├── auth.spec.ts
│   │       └── purchase-flow.spec.ts
│   │
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   └── playwright.config.ts
│
├── .husky/
│   ├── pre-commit                    # Lint + Format
│   └── pre-push                      # Tests
│
├── .vscode/
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json
│
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── package.json                      # Root (workspaces)
├── tsconfig.json                     # Root config
├── README.md
└── LICENSE
