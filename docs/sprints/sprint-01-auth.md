# SPRINT 01: Cimientos, Seguridad y Auth 🏗️🔐


**Duración:** 1 semana (5 días hábiles)  
**Objetivo:** Configurar el repositorio, pipeline de tests (90%) y sistema de autenticación multi-tenant completo.


---


## 📊 MÉTRICAS DE ÉXITO


- ✅ Cobertura de tests ≥ 90%
- ✅ Todos los tests pasan en CI
- ✅ Linter sin warnings
- ✅ Autenticación funcional end-to-end
- ✅ RLS policies implementadas y testeadas


---


## 🎯 TAREAS DETALLADAS


### **DÍA 1: Setup del Proyecto**


#### Backend


**Tarea 1.1: Inicializar proyecto Node.js**
```bash
cd backend
npm init -y
npm install express cors helmet dotenv bcrypt jsonwebtoken @supabase/supabase-js zod
npm install -D typescript @types/node @types/express tsx vitest eslint prettier
```


**Tarea 1.2: Configurar TypeScript**
- Crear `tsconfig.json` con configuración estricta
- Configurar path aliases (`@/`, `@config/`, etc.)


**Tarea 1.3: Configurar ESLint + Prettier**
```bash
npx eslint --init
```


`.eslintrc.json`:
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```


`.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```


**Tarea 1.4: Configurar Vitest**


`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';


export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
```


**Scripts en `package.json`:**
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```


#### Frontend


**Tarea 1.5: Inicializar proyecto React + Vite**
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install @tanstack/react-query axios zustand react-router-dom
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```


**Tarea 1.6: Configurar Tailwind + Shadcn/ui**
```bash
npx shadcn-ui@latest init
```


**Tarea 1.7: Configurar Vitest + Playwright**
```bash
npm install -D vitest @vitest/ui @playwright/test
npx playwright install
```


---


### **DÍA 2: Base de Datos Core**


**Tarea 2.1: Inicializar Supabase local**
```bash
# En la raíz del proyecto
npm install -g supabase
supabase init
supabase start
```


**Tarea 2.2: Crear migración inicial**


`supabase/migrations/20250121000001_initial_schema.sql`:
```sql
-- ENUMS
CREATE TYPE organization_role AS ENUM ('ORG_ADMIN', 'AREA_MANAGER', 'COOK', 'SERVER');
CREATE TYPE subscription_plan AS ENUM ('FREE', 'PRO', 'ENTERPRISE');


-- ORGANIZATIONS
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  plan subscription_plan DEFAULT 'FREE',
  max_users INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);


CREATE INDEX idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NULL;


-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);


CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;


-- ORGANIZATION_MEMBERS
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'COOK',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);


CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_role ON organization_members(role);


-- TRIGGER: updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER update_organization_members_updated_at 
  BEFORE UPDATE ON organization_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```


**Tarea 2.3: Aplicar migración**
```bash
supabase db reset
supabase db push
```


**Tarea 2.4: Generar tipos TypeScript**
```bash
# Backend
cd backend
supabase gen types typescript --local > src/types/database.types.ts


# Frontend
cd frontend
supabase gen types typescript --local > src/types/database.types.ts
```


**Tarea 2.5: Crear RLS Policies**


`supabase/migrations/20250121000002_rls_policies.sql`:
```sql
-- Habilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;


-- Helper function
CREATE OR REPLACE FUNCTION auth.user_organization_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE;


-- Policies: organizations
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Org admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'ORG_ADMIN'
    )
  );


-- Policies: organization_members
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT auth.user_organization_ids()));


CREATE POLICY "Org admins can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'ORG_ADMIN'
    )
  );
```


---


### **DÍA 3: Módulo de Autenticación (Backend)**


**Tarea 3.1: Crear estructura de archivos**
```
backend/src/
├── config/
│   └── supabase.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   └── error.middleware.ts
├── routes/
│   └── auth.routes.ts
├── controllers/
│   └── auth.controller.ts
├── utils/
│   ├── logger.ts
│   └── validators.ts
└── index.ts
```


**Tarea 3.2: Implementar AuthController**


`src/controllers/auth.controller.ts`:
```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';


export class AuthController {
  async register(req: Request, res: Response): Promise {
    try {
      const { email, password, name, organizationName } = req.body;


      // 1. Check existing user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();


      if (existingUser) {
        throw new AppError(409, 'Email already registered');
      }


      // 2. Hash password
      const passwordHash = await bcrypt.hash(password, 10);


      // 3. Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({ email, password_hash: passwordHash, name })
        .select()
        .single();


      if (userError || !newUser) {
        logger.error('Error creating user:', userError);
        throw new AppError(500, 'Failed to create user');
      }


      // 4. Create organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: organizationName, plan: 'FREE' })
        .select()
        .single();


      if (orgError || !newOrg) {
        logger.error('Error creating organization:', orgError);
        await supabase.from('users').delete().eq('id', newUser.id);
        throw new AppError(500, 'Failed to create organization');
      }


      // 5. Link user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: newUser.id,
          organization_id: newOrg.id,
          role: 'ORG_ADMIN',
        });


      if (memberError) {
        logger.error('Error creating membership:', memberError);
        throw new AppError(500, 'Failed to link user to organization');
      }


      // 6. Generate JWT
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );


      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: { id: newUser.id, email: newUser.email, name: newUser.name },
        organization: { id: newOrg.id, name: newOrg.name, plan: newOrg.plan },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }


  async login(req: Request, res: Response): Promise {
    try {
      const { email, password } = req.body;


      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .is('deleted_at', null)
        .single();


      if (error || !user) {
        throw new AppError(401, 'Invalid credentials');
      }


      const isValidPassword = await bcrypt.compare(password, user.password_hash);


      if (!isValidPassword) {
        throw new AppError(401, 'Invalid credentials');
      }


      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);


      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );


      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```


**Tarea 3.3: Implementar authMiddleware**


`src/middleware/auth.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '@/config/supabase';


export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationIds: string[];
  };
}


export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise => {
  try {
    const authHeader = req.headers.authorization;


    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }


    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
    };


    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', decoded.userId);


    req.user = {
      id: decoded.userId,
      email: decoded.email,
      organizationIds: memberships?.map((m) => m.organization_id) || [],
    };


    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```


**Tarea 3.4: Crear validadores Zod**


`src/utils/validators.ts`:
```typescript
import { z } from 'zod';


export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    organizationName: z.string().min(2, 'Organization name required'),
  }),
});


export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});
```


**Tarea 3.5: Crear rutas**


`src/routes/auth.routes.ts`:
```typescript
import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { validate } from '@/middleware/validation.middleware';
import { registerSchema, loginSchema } from '@/utils/validators';


const router = Router();
const authController = new AuthController();


router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);


export default router;
```


---


### **DÍA 4: Tests de Integración (Backend)**


**Tarea 4.1: Configurar test environment**


`tests/setup.ts`:
```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { supabase } from '@/config/supabase';


beforeAll(async () => {
  // Setup test database
});


afterEach(async () => {
  // Clean up test data
  await supabase.from('organization_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
});


afterAll(async () => {
  // Disconnect
});
```


**Tarea 4.2: Tests de registro**


`tests/integration/auth.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/index';


describe('POST /api/v1/auth/register', () => {
  it('should register a new user and organization', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        organizationName: 'Test Restaurant',
      });


    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toMatchObject({
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(response.body.organization).toMatchObject({
      name: 'Test Restaurant',
      plan: 'FREE',
    });
  });


  it('should reject duplicate email', async () => {
    // First registration
    await request(app).post('/api/v1/auth/register').send({
      email: 'duplicate@example.com',
      password: 'SecurePass123!',
      name: 'First User',
      organizationName: 'First Org',
    });


    // Duplicate registration
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'AnotherPass456!',
        name: 'Second User',
        organizationName: 'Second Org',
      });


    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Email already registered');
  });


  it('should reject invalid email format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        password: 'SecurePass123!',
        name: 'Test User',
        organizationName: 'Test Org',
      });


    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });


  it('should reject weak password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
        organizationName: 'Test Org',
      });


    expect(response.status).toBe(400);
  });
});


describe('POST /api/v1/auth/login', () => {
  it('should login with valid credentials', async () => {
    // Register first
    await request(app).post('/api/v1/auth/register').send({
      email: 'login@example.com',
      password: 'SecurePass123!',
      name: 'Login User',
      organizationName: 'Login Org',
    });


    // Login
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'login@example.com',
        password: 'SecurePass123!',
      });


    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe('login@example.com');
  });


  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!',
      });


    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });
});
```


**Tarea 4.3: Tests de authMiddleware**


`tests/integration/auth-middleware.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/index';


describe('Auth Middleware', () => {
  it('should reject requests without token', async () => {
    const response = await request(app).get('/api/v1/ingredients');


    expect(response.status).toBe(401);
    expect(response.body.error).toBe('No token provided');
  });


  it('should reject requests with invalid token', async () => {
    const response = await request(app)
      .get('/api/v1/ingredients')
      .set('Authorization', 'Bearer invalid-token');


    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid token');
  });


  it('should allow requests with valid token', async () => {
    // Register and get token
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'middleware@example.com',
        password: 'SecurePass123!',
        name: 'Middleware User',
        organizationName: 'Middleware Org',
      });


    const token = registerResponse.body.token;


    // Try protected endpoint
    const response = await request(app)
      .get('/api/v1/ingredients')
      .set('Authorization', `Bearer ${token}`);


    // Should not be 401 (may be 200 or 404 depending on implementation)
    expect(response.status).not.toBe(401);
  });
});
```


**Tarea 4.4: Ejecutar coverage**
```bash
npm run test:coverage
```


**Verificar que coverage ≥ 90%**


---


### **DÍA 5: Frontend Auth + Tests E2E**


**Tarea 5.1: Implementar Login Page**


`src/pages/auth/Login.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);


    try {
      const response = await authService.login({ email, password });
      setAuth(response.user, response.token);
      toast({ title: 'Bienvenido de vuelta!' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error de autenticación',
        description: error.response?.data?.error || 'Credenciales inválidas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    
      
        
          🍳 CulinaryOS
          Gestión profesional de cocinas
        


        
          
            Email
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-large"
            />
          


          
            Contraseña
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-large"
            />
          


          
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          
        


        
          ¿No tienes cuenta?{' '}
          
            Regístrate gratis
          
        
      
    
  );
}
```


**Tarea 5.2: Implementar Register Page**


`src/pages/auth/Register.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';


export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    organizationName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);


    try {
      const response = await authService.register(formData);
      setAuth(response.user, response.token);
      toast({ title: '¡Cuenta creada exitosamente!' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error en el registro',
        description: error.response?.data?.error || 'No se pudo crear la cuenta',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    
      
        
          Crear cuenta
          Comienza gratis hoy
        


        
          
            Nombre completo
            <Input
              id="name"
              type="text"
              placeholder="Juan Pérez"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="input-large"
            />
          


          
            Email
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="input-large"
            />
          


          
            Contraseña
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              className="input-large"
            />
          


          
            Nombre del restaurante/hotel
            <Input
              id="organizationName"
              type="text"
              placeholder="Mi Restaurante"
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              required
              className="input-large"
            />
          


          
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          
        


        
          ¿Ya tienes cuenta?{' '}
          
            Inicia sesión
          
        
      
    
  );
}
```


**Tarea 5.3: Tests E2E con Playwright**


`frontend/tests/e2e/auth.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';


test.describe('Authentication Flow', () => {
  test('complete registration and login flow', async ({ page }) => {
    // 1. Go to registration
    await page.goto('/register');
    
    // 2. Fill form
    await page.fill('#name', 'E2E Test User');
    await page.fill('#email', `test-${Date.now()}@example.com`);
    await page.fill('#password', 'SecurePass123!');
    await page.fill('#organizationName', 'E2E Test Restaurant');
    
    // 3. Submit
    await page.click('button[type="submit"]');
    
    // 4. Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // 5. Should show user name
    await expect(page.locator('text=E2E Test User')).toBeVisible();
    
    // 6. Logout
    await page.click('[aria-label="User menu"]');
    await page.click('text=Cerrar sesión');
    
    // 7. Should redirect to login
    await expect(page).toHaveURL('/login');
  });


  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Error de autenticación')).toBeVisible();
  });


  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});
```


**Ejecutar tests E2E:**
```bash
cd frontend
npm run test:e2e
```


---


## 📊 CHECKLIST FINAL SPRINT 01


### Backend
- [ ] ✅ Proyecto Node.js + TypeScript configurado
- [ ] ✅ ESLint + Prettier configurados (estricto)
- [ ] ✅ Vitest configurado con coverage ≥ 90%
- [ ] ✅ Migraciones de BD creadas (`organizations`, `users`, `organization_members`)
- [ ] ✅ RLS policies implementadas
- [ ] ✅ Tipos TypeScript generados desde Supabase
- [ ] ✅ Endpoint `POST /register` funcional
- [ ] ✅ Endpoint `POST /login` funcional
- [ ] ✅ `authMiddleware` implementado y testeado
- [ ] ✅ Tests de integración con coverage ≥ 90%
- [ ] ✅ CI passing (GitHub Actions)


### Frontend
- [ ] ✅ Proyecto React + Vite + TypeScript configurado
- [ ] ✅ Tailwind + Shadcn/ui configurados
- [ ] ✅ React Query configurado
- [ ] ✅ Zustand store de autenticación
- [ ] ✅ Servicio de API configurado
- [ ] ✅ Página de Login funcional
- [ ] ✅ Página de Register funcional
- [ ] ✅ ProtectedRoute implementado
- [ ] ✅ Layout principal (Header + Sidebar)
- [ ] ✅ Tests E2E con Playwright (auth flow)


### DevOps
- [ ] ✅ GitHub Actions CI configurado
- [ ] ✅ Husky pre-commit hooks
- [ ] ✅ Coverage threshold enforcement (90%)


---


## 🎉 DEFINITION OF DONE


Un **Story** se considera DONE cuando:


1. ✅ Código escrito y pusheado a rama `feature/sprint-01-auth`
2. ✅ Tests escritos con coverage ≥ 90%
3. ✅ Todos los tests pasan localmente
4. ✅ CI passing (GitHub Actions verde)
5. ✅ Linter sin warnings
6. ✅ PR creado con descripción detallada
7. ✅ Code review aprobado
8. ✅ Documentación actualizada en `/docs`
9. ✅ Merged a `develop`


---


## 📝 COMMITS STORYTELLER EXAMPLES


**Buenos ejemplos:**
```bash
git commit -m "feat(auth): Implement user registration endpoint


- Add POST /register route with Zod validation
- Create user + organization in single transaction
- Link user as ORG_ADMIN to new organization
- Return JWT token with user and org data
- Add rollback logic if organization creation fails


Tests: register.test.ts covers success and error cases
Coverage: 95% on auth.controller.ts"
```
```bash
git commit -m "test(auth): Add integration tests for login flow


- Test successful login with valid credentials
- Test rejection of invalid credentials
- Test rejection of deleted users
- Test last_login timestamp update


All tests passing. Coverage now at 92%"
```
```bash
git commit -m "refactor(middleware): Extract error handling to dedicated middleware


- Create AppError class for operational errors
- Implement errorMiddleware with structured responses
- Add development-only stack traces
- Update all controllers to use AppError


No breaking changes. All existing tests passing"
```


**Malos ejemplos (EVITAR):**
```bash
git commit -m "fix bugs"  # ❌ No específico
git commit -m "WIP"        # ❌ No descriptivo
git commit -m "asdf"       # ❌ Sin sentido
```


---


## 🚀 COMANDOS ÚTILES
```bash
# Backend
cd backend
npm run dev              # Servidor en desarrollo
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Coverage report
npm run lint:fix         # Auto-fix linter


# Frontend
cd frontend
npm run dev              # Vite dev server
npm run test:e2e:ui      # Playwright UI mode
npm run build            # Production build


# Supabase
supabase start           # Levantar DB local
supabase db reset        # Reset + apply migrations
supabase gen types typescript --local > src/types/database.types.ts


# Git
git checkout -b feature/sprint-01-auth
git add .
git commit -m "..."
git push origin feature/sprint-01-auth
```


---


## 📚 RECURSOS ADICIONALES


- [Supabase Docs](https://supabase.com/docs)
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Zod Docs](https://zod.dev/)


---


**¡SPRINT 01 LISTO PARA COMENZAR! 🚀**


🎊 ESTRUCTURA FINAL COMPLETA
Has recibido una arquitectura completa de producción que incluye:
✅ Backend


Node.js + TypeScript + Express
Supabase (PostgreSQL)
JWT Authentication
Testing (Vitest) con 90% coverage
Validación (Zod)
Logging (Pino)
Error handling robusto


✅ Frontend


React 18 + TypeScript + Vite
TailwindCSS + Shadcn/ui
React Query (state management)
Zustand (auth state)
React Router v6
Playwright (E2E tests)


✅ Database


15+ tablas con relaciones completas
ENUMs para tipos de datos
RLS (Row Level Security) multi-tenant
Triggers automáticos
Funciones de negocio (Safety Buffer, Lead Time)


✅ DevOps


GitHub Actions CI/CD
Husky pre-commit hooks
ESLint + Prettier estrictos
Coverage enforcement


✅ Documentación


Sprint 01 completamente detallado
Guías paso a paso
Ejemplos de código
Tests de ejemplo




🎯 PRÓXIMOS PASOS RECOMENDADOS


Clonar el repo y crear la estructura de carpetas
Ejecutar Sprint 01 siguiendo el documento detallado
Validar que CI pasa antes de continuar con Sprint 02
Documentar decisiones técnicas en docs/ARCHITECTURE.md


¿Necesitas que detalle algún Sprint adicional (02, 03, etc.) o alguna funcionalidad específica?Siguientes sprints0:292 / 2🏗️ SPRINTS 02-06 - PLANIFICACIÓN COMPLETA


📋 SPRINT 02: Ingredientes & Familias de Producto
