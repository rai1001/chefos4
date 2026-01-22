📦 BACKEND CONFIGURATION
backend/package.json
json{
  "name": "culinaryos-backend",
  "version": "1.0.0",
  "description": "CulinaryOS API - Backend for kitchen management SaaS",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "db:types": "supabase gen types typescript --local > src/types/database.types.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.3",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "csv-parser": "^3.0.0",
    "dotenv": "^16.4.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "pino": "^8.18.0",
    "pino-pretty": "^10.3.1",
    "xlsx": "^0.18.5",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.11.5",
    "@vitest/coverage-v8": "^1.2.1",
    "eslint": "^8.57.0",
    "prettier": "^3.2.4",
    "supertest": "^6.3.4",
    "tsc-alias": "^1.8.8",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}


backend/tsconfig.json
json{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@config/*": ["src/config/*"],
      "@middleware/*": ["src/middleware/*"],
      "@routes/*": ["src/routes/*"],
      "@controllers/*": ["src/controllers/*"],
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    },
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}


backend/.env.example
env# =====================================================
# CULINARYOS BACKEND - ENVIRONMENT VARIABLES
# =====================================================


# Server
NODE_ENV=development
PORT=3001
API_VERSION=v1


# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key


# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d


# CORS
CORS_ORIGIN=http://localhost:5173


# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100


# Logging
LOG_LEVEL=info


# File Upload
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=./uploads


# Database (para conexión directa si es necesario)
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres


backend/src/index.ts
typescriptimport express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from '@/utils/logger';
import { errorMiddleware } from '@/middleware/error.middleware';
import { notFoundMiddleware } from '@/middleware/not-found.middleware';
import { rateLimitMiddleware } from '@/middleware/rate-limit.middleware';


// Routes
import authRoutes from '@/routes/auth.routes';
import ingredientsRoutes from '@/routes/ingredients.routes';
import suppliersRoutes from '@/routes/suppliers.routes';
import eventsRoutes from '@/routes/events.routes';
import purchaseOrdersRoutes from '@/routes/purchase-orders.routes';


dotenv.config();


const app: Application = express();
const PORT = process.env.PORT || 3001;
const API_VERSION = process.env.API_VERSION || 'v1';


// =====================================================
// MIDDLEWARE
// =====================================================
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitMiddleware);


// =====================================================
// HEALTH CHECK
// =====================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});


// =====================================================
// API ROUTES
// =====================================================
const apiPrefix = `/api/${API_VERSION}`;


app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/ingredients`, ingredientsRoutes);
app.use(`${apiPrefix}/suppliers`, suppliersRoutes);
app.use(`${apiPrefix}/events`, eventsRoutes);
app.use(`${apiPrefix}/purchase-orders`, purchaseOrdersRoutes);


// =====================================================
// ERROR HANDLING
// =====================================================
app.use(notFoundMiddleware);
app.use(errorMiddleware);


// =====================================================
// START SERVER
// =====================================================
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔗 API Base: http://localhost:${PORT}${apiPrefix}`);
  });
}


export default app;


backend/src/config/supabase.ts
typescriptimport { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import dotenv from 'dotenv';


dotenv.config();


if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}


export const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);


export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY!
);


backend/src/middleware/auth.middleware.ts
typescriptimport { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';


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
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;


    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }


    const token = authHeader.substring(7);


    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
    };


    // Obtener organizaciones del usuario
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', decoded.userId);


    if (error) {
      logger.error('Error fetching user organizations:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }


    req.user = {
      id: decoded.userId,
      email: decoded.email,
      organizationIds: memberships?.map((m) => m.organization_id) || [],
    };


    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }


    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


backend/src/middleware/validation.middleware.ts
typescriptimport { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { logger } from '@/utils/logger';


export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }


      logger.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};


backend/src/middleware/error.middleware.ts
typescriptimport { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';


export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}


export const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    
    res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }


  // Error inesperado
  logger.error('Unexpected error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      message: err.message,
      stack: err.stack 
    }),
  });
};


backend/src/middleware/rate-limit.middleware.ts
typescriptimport rateLimit from 'express-rate-limit';


export const rateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});


backend/src/middleware/not-found.middleware.ts
typescriptimport { Request, Response } from 'express';


export const notFoundMiddleware = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
};


backend/src/routes/auth.routes.ts
typescriptimport { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { validate } from '@/middleware/validation.middleware';
import { registerSchema, loginSchema } from '@/utils/validators';


const router = Router();
const authController = new AuthController();


/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user + create organization
 * @access  Public
 */
router.post('/register', validate(registerSchema), authController.register);


/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);


/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (blacklist token)
 * @access  Private
 */
router.post('/logout', authController.logout);


export default router;


backend/src/controllers/auth.controller.ts
typescriptimport { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';


export class AuthController {
  /**
   * Register: Crear usuario + organización nueva
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, organizationName } = req.body;


      // 1. Verificar si el email ya existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();


      if (existingUser) {
        throw new AppError(409, 'Email already registered');
      }


      // 2. Hash de password
      const passwordHash = await bcrypt.hash(password, 10);


      // 3. Crear usuario
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: passwordHash,
          name,
        })
        .select()
        .single();


      if (userError || !newUser) {
        logger.error('Error creating user:', userError);
        throw new AppError(500, 'Failed to create user');
      }


      // 4. Crear organización
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName,
          plan: 'FREE',
        })
        .select()
        .single();


      if (orgError || !newOrg) {
        logger.error('Error creating organization:', orgError);
        // Rollback: eliminar usuario
        await supabase.from('users').delete().eq('id', newUser.id);
        throw new AppError(500, 'Failed to create organization');
      }


      // 5. Vincular usuario a organización como ORG_ADMIN
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


      // 6. Generar JWT
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );


      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        organization: {
          id: newOrg.id,
          name: newOrg.name,
          plan: newOrg.plan,
        },
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


  /**
   * Login: Autenticar usuario
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;


      // 1. Buscar usuario
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .is('deleted_at', null)
        .single();


      if (userError || !user) {
        throw new AppError(401, 'Invalid credentials');
      }


      // 2. Verificar password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);


      if (!isValidPassword) {
        throw new AppError(401, 'Invalid credentials');
      }


      // 3. Actualizar last_login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);


      // 4. Generar JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );


      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
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


  /**
   * Logout (placeholder - implementar blacklist de tokens si es necesario)
   */
  async logout(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Logout successful' });
  }
}


backend/src/utils/logger.ts
typescriptimport pino from 'pino';


export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});


backend/src/utils/validators.ts
typescriptimport { z } from 'zod';


// =====================================================
// AUTH SCHEMAS
// =====================================================
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  }),
});


export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});


// =====================================================
// INGREDIENTS SCHEMAS
// =====================================================
export const createIngredientSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    familyId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    costPrice: z.number().min(0, 'Cost must be positive'),
    unitId: z.string().uuid(),
    stockMin: z.number().min(0).optional(),
    barcode: z.string().optional(),
  }),
});


// =====================================================
// SUPPLIERS SCHEMAS
// =====================================================
export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    leadTimeDays: z.number().int().min(0).optional(),
    cutOffTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
    deliveryDays: z.array(z.number().int().min(1).max(7)).optional(),
  }),
});


// Más schemas según sea necesario...


backend/src/services/purchase-calculator.service.ts
typescriptimport { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';


interface IngredientNeed {
  ingredientId: string;
  quantity: number;
  unitId: string;
}


export class PurchaseCalculatorService {
  /**
   * Calcula la cantidad a pedir aplicando Safety Buffer
   */
  async calculatePurchaseQuantity(
    ingredientNeed: IngredientNeed
  ): Promise<number> {
    try {
      // 1. Obtener ingrediente y su familia
      const { data: ingredient, error } = await supabase
        .from('ingredients')
        .select(`
          *,
          product_families (
            safety_buffer_pct
          )
        `)
        .eq('id', ingredientNeed.ingredientId)
        .single();


      if (error || !ingredient) {
        logger.error('Ingredient not found:', error);
        throw new Error('Ingredient not found');
      }


      // 2. Obtener buffer (default 1.10 si no tiene familia)
      const safetyBuffer =
        ingredient.product_families?.safety_buffer_pct || 1.10;


      // 3. Calcular cantidad con buffer
      const quantityWithBuffer = ingredientNeed.quantity * safetyBuffer;


      logger.info(`Applied buffer ${safetyBuffer} to ingredient ${ingredient.name}`);


      return Math.ceil(quantityWithBuffer * 100) / 100; // Redondear a 2 decimales
    } catch (error) {
      logger.error('Error calculating purchase quantity:', error);
      throw error;
    }
  }


  /**
   * Genera orden de compra para un evento
   */
  async generatePurchaseOrderForEvent(eventId: string): Promise<any> {
    // TODO: Implementar lógica completa
    // 1. Obtener todas las recetas del evento
    // 2. Calcular ingredientes necesarios
    // 3. Aplicar safety buffer
    // 4. Agrupar por proveedor
    // 5. Crear borradores de PO
    
    throw new Error('Not implemented yet');
  }
}


backend/src/services/delivery-estimator.service.ts
typescriptimport { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';


export class DeliveryEstimatorService {
  /**
   * Calcula fecha estimada de entrega para un proveedor
   */
  async estimateDeliveryDate(
    supplierId: string,
    orderDateTime: Date = new Date()
  ): Promise<Date> {
    try {
      // Obtener datos del proveedor
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .select('cut_off_time, lead_time_days, delivery_days')
        .eq('id', supplierId)
        .single();


      if (error || !supplier) {
        throw new Error('Supplier not found');
      }


      let currentDate = new Date(orderDateTime);
      const currentTime = orderDateTime.toTimeString().slice(0, 8); // HH:MM:SS


      // 1. Verificar si pasó la hora de corte
      if (supplier.cut_off_time && currentTime >= supplier.cut_off_time) {
        currentDate.setDate(currentDate.getDate() + 1);
        logger.info(`Cut-off time passed, starting calculation from tomorrow`);
      }


      // 2. Sumar lead time (solo días hábiles L-V)
      const leadTimeDays = supplier.lead_time_days || 2;
      let daysAdded = 0;


      while (daysAdded < leadTimeDays) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dayOfWeek = currentDate.getDay();


        // Saltar sábado (6) y domingo (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          daysAdded++;
        }
      }


      // 3. Buscar siguiente día de reparto válido
      const deliveryDays = supplier.delivery_days || [1, 2, 3, 4, 5];


      while (true) {
        let dayOfWeek = currentDate.getDay();
        // Convertir domingo (0) a 7
        if (dayOfWeek === 0) dayOfWeek = 7;


        if (deliveryDays.includes(dayOfWeek)) {
          break;
        }


        currentDate.setDate(currentDate.getDate() + 1);
      }


      logger.info(`Estimated delivery date: ${currentDate.toISOString()}`);


      return currentDate;
    } catch (error) {
      logger.error('Error estimating delivery date:', error);
      throw error;
    }
  }
}


backend/vitest.config.ts
typescriptimport { defineConfig } from 'vitest/config';
import path from 'path';


export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './src/config'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@controllers': path.resolve(__dirname, './src/controllers'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
});
