# SPRINT 02: Ingredientes & Familias de Producto 📦


**Duración:** 1 semana (5 días hábiles)  
**Objetivo:** Implementar el módulo completo de gestión de ingredientes con sus familias y sistema de unidades de medida.


---


## 📊 MÉTRICAS DE ÉXITO


- ✅ Cobertura de tests ≥ 90%
- ✅ CRUD completo de ingredientes
- ✅ Sistema de unidades funcionando
- ✅ Conversiones automáticas implementadas
- ✅ Safety Buffer por familia configurado


---


## 🎯 TAREAS DETALLADAS


### **DÍA 1: Migraciones de BD + Seed Data**


#### Tarea 1.1: Crear migraciones de unidades


`supabase/migrations/20250128000001_units_and_conversions.sql`:
```sql
-- Ya está en el schema principal, pero verificar que existe


-- Seed data: Unidades base
INSERT INTO units (name, abbreviation, type) VALUES
  ('Kilogramo', 'kg', 'MASS'),
  ('Gramo', 'g', 'MASS'),
  ('Litro', 'l', 'VOLUME'),
  ('Mililitro', 'ml', 'VOLUME'),
  ('Unidad', 'ud', 'UNIT'),
  ('Caja', 'cj', 'UNIT'),
  ('Docena', 'dz', 'UNIT'),
  ('Paquete', 'pq', 'UNIT'),
  ('Metro', 'm', 'LENGTH'),
  ('Centímetro', 'cm', 'LENGTH')
ON CONFLICT (abbreviation) DO NOTHING;


-- Conversiones globales
WITH unit_ids AS (
  SELECT 
    (SELECT id FROM units WHERE abbreviation = 'kg') AS kg_id,
    (SELECT id FROM units WHERE abbreviation = 'g') AS g_id,
    (SELECT id FROM units WHERE abbreviation = 'l') AS l_id,
    (SELECT id FROM units WHERE abbreviation = 'ml') AS ml_id,
    (SELECT id FROM units WHERE abbreviation = 'm') AS m_id,
    (SELECT id FROM units WHERE abbreviation = 'cm') AS cm_id,
    (SELECT id FROM units WHERE abbreviation = 'dz') AS dz_id,
    (SELECT id FROM units WHERE abbreviation = 'ud') AS ud_id
)
INSERT INTO uom_conversions (from_unit_id, to_unit_id, factor, ingredient_id) 
SELECT kg_id, g_id, 1000, NULL FROM unit_ids
UNION ALL
SELECT l_id, ml_id, 1000, NULL FROM unit_ids
UNION ALL
SELECT m_id, cm_id, 100, NULL FROM unit_ids
UNION ALL
SELECT dz_id, ud_id, 12, NULL FROM unit_ids
ON CONFLICT DO NOTHING;
```


#### Tarea 1.2: Seed de familias de producto


`supabase/seed.sql` (añadir):
```sql
-- Nota: Esto se ejecutará después de crear la primera organización
-- Por ahora, crear función helper


CREATE OR REPLACE FUNCTION seed_product_families(p_org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO product_families (organization_id, name, description, safety_buffer_pct) VALUES
    (p_org_id, 'Carnes y Pescados', 'Productos cárnicos y pescados frescos', 1.05),
    (p_org_id, 'Vegetales y Frutas', 'Productos frescos de origen vegetal', 1.15),
    (p_org_id, 'Lácteos', 'Leche, quesos, yogures y derivados', 1.08),
    (p_org_id, 'Secos y Abarrotes', 'Productos no perecederos', 1.10),
    (p_org_id, 'Bebidas', 'Bebidas alcohólicas y no alcohólicas', 1.02),
    (p_org_id, 'Panadería', 'Pan, bollería y masas', 1.12),
    (p_org_id, 'Congelados', 'Productos ultracongelados', 1.08),
    (p_org_id, 'Especias y Condimentos', 'Condimentos, hierbas y especias', 1.05)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;


COMMENT ON FUNCTION seed_product_families IS 'Crea familias de producto por defecto para una organización';
```


---


### **DÍA 2: Backend - CRUD de Familias**


#### Tarea 2.1: Modelo y tipos


`backend/src/types/models.ts`:
```typescript
export interface ProductFamily {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  safety_buffer_pct: number;
  created_at: string;
  updated_at: string;
}


export interface CreateProductFamilyDto {
  name: string;
  description?: string;
  safety_buffer_pct?: number;
}


export interface UpdateProductFamilyDto {
  name?: string;
  description?: string;
  safety_buffer_pct?: number;
}
```


#### Tarea 2.2: Controller de familias


`backend/src/controllers/product-families.controller.ts`:
```typescript
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';


export class ProductFamiliesController {
  async getAll(req: AuthRequest, res: Response): Promise {
    try {
      const orgIds = req.user!.organizationIds;


      const { data, error } = await supabase
        .from('product_families')
        .select('*')
        .in('organization_id', orgIds)
        .order('name');


      if (error) throw error;


      res.json({ data, total: data?.length || 0 });
    } catch (error) {
      logger.error('Error fetching product families:', error);
      res.status(500).json({ error: 'Failed to fetch product families' });
    }
  }


  async getById(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      const { data, error } = await supabase
        .from('product_families')
        .select('*')
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (error || !data) {
        throw new AppError(404, 'Product family not found');
      }


      res.json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error fetching product family:', error);
      res.status(500).json({ error: 'Failed to fetch product family' });
    }
  }


  async create(req: AuthRequest, res: Response): Promise {
    try {
      const { name, description, safety_buffer_pct } = req.body;
      const organizationId = req.user!.organizationIds[0]; // Primera org del usuario


      const { data, error } = await supabase
        .from('product_families')
        .insert({
          organization_id: organizationId,
          name,
          description,
          safety_buffer_pct: safety_buffer_pct || 1.10,
        })
        .select()
        .single();


      if (error) {
        if (error.code === '23505') {
          throw new AppError(409, 'Product family with this name already exists');
        }
        throw error;
      }


      res.status(201).json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error creating product family:', error);
      res.status(500).json({ error: 'Failed to create product family' });
    }
  }


  async update(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const { name, description, safety_buffer_pct } = req.body;
      const orgIds = req.user!.organizationIds;


      // Verificar que existe y pertenece a la org del usuario
      const { data: existing } = await supabase
        .from('product_families')
        .select('id')
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (!existing) {
        throw new AppError(404, 'Product family not found');
      }


      const { data, error } = await supabase
        .from('product_families')
        .update({ name, description, safety_buffer_pct })
        .eq('id', id)
        .select()
        .single();


      if (error) throw error;


      res.json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error updating product family:', error);
      res.status(500).json({ error: 'Failed to update product family' });
    }
  }


  async delete(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // Verificar si tiene ingredientes asociados
      const { count } = await supabase
        .from('ingredients')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', id)
        .is('deleted_at', null);


      if (count && count > 0) {
        throw new AppError(
          400,
          `Cannot delete family with ${count} associated ingredients`
        );
      }


      const { error } = await supabase
        .from('product_families')
        .delete()
        .eq('id', id)
        .in('organization_id', orgIds);


      if (error) throw error;


      res.json({ message: 'Product family deleted successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error deleting product family:', error);
      res.status(500).json({ error: 'Failed to delete product family' });
    }
  }
}
```


#### Tarea 2.3: Routes


`backend/src/routes/product-families.routes.ts`:
```typescript
import { Router } from 'express';
import { ProductFamiliesController } from '@/controllers/product-families.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { createProductFamilySchema, updateProductFamilySchema } from '@/utils/validators';


const router = Router();
const controller = new ProductFamiliesController();


// Todas las rutas requieren autenticación
router.use(authMiddleware);


router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', validate(createProductFamilySchema), controller.create);
router.patch('/:id', validate(updateProductFamilySchema), controller.update);
router.delete('/:id', controller.delete);


export default router;
```


#### Tarea 2.4: Validators


`backend/src/utils/validators.ts` (añadir):
```typescript
export const createProductFamilySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    safety_buffer_pct: z
      .number()
      .min(1.0)
      .max(2.0)
      .optional()
      .default(1.10),
  }),
});


export const updateProductFamilySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    safety_buffer_pct: z.number().min(1.0).max(2.0).optional(),
  }),
});
```


---


### **DÍA 3: Backend - CRUD de Ingredientes**


#### Tarea 3.1: Controller de ingredientes


`backend/src/controllers/ingredients.controller.ts`:
```typescript
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';


export class IngredientsController {
  async getAll(req: AuthRequest, res: Response): Promise {
    try {
      const orgIds = req.user!.organizationIds;
      const { 
        page = 1, 
        limit = 50,
        search = '',
        family_id,
        supplier_id 
      } = req.query;


      let query = supabase
        .from('ingredients')
        .select(`
          *,
          product_families (id, name, safety_buffer_pct),
          suppliers (id, name),
          units!ingredients_unit_id_fkey (id, name, abbreviation)
        `, { count: 'exact' })
        .in('organization_id', orgIds)
        .is('deleted_at', null);


      // Filtros
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (family_id) {
        query = query.eq('family_id', family_id);
      }
      if (supplier_id) {
        query = query.eq('supplier_id', supplier_id);
      }


      // Paginación
      const offset = (Number(page) - 1) * Number(limit);
      query = query.range(offset, offset + Number(limit) - 1);


      const { data, error, count } = await query.order('name');


      if (error) throw error;


      res.json({
        data,
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil((count || 0) / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Error fetching ingredients:', error);
      res.status(500).json({ error: 'Failed to fetch ingredients' });
    }
  }


  async getById(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      const { data, error } = await supabase
        .from('ingredients')
        .select(`
          *,
          product_families (id, name, safety_buffer_pct),
          suppliers (id, name, contact_email),
          units!ingredients_unit_id_fkey (id, name, abbreviation, type)
        `)
        .eq('id', id)
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .single();


      if (error || !data) {
        throw new AppError(404, 'Ingredient not found');
      }


      res.json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error fetching ingredient:', error);
      res.status(500).json({ error: 'Failed to fetch ingredient' });
    }
  }


  async create(req: AuthRequest, res: Response): Promise {
    try {
      const {
        name,
        description,
        family_id,
        supplier_id,
        cost_price,
        unit_id,
        stock_current,
        stock_min,
        barcode,
      } = req.body;


      const organizationId = req.user!.organizationIds[0];


      const { data, error } = await supabase
        .from('ingredients')
        .insert({
          organization_id: organizationId,
          name,
          description,
          family_id,
          supplier_id,
          cost_price,
          unit_id,
          stock_current: stock_current || 0,
          stock_min: stock_min || 0,
          barcode,
        })
        .select(`
          *,
          product_families (id, name),
          suppliers (id, name),
          units!ingredients_unit_id_fkey (id, name, abbreviation)
        `)
        .single();


      if (error) {
        if (error.code === '23505') {
          throw new AppError(409, 'Ingredient with this name already exists');
        }
        throw error;
      }


      res.status(201).json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error creating ingredient:', error);
      res.status(500).json({ error: 'Failed to create ingredient' });
    }
  }


  async update(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;
      const updateData = req.body;


      // Verificar ownership
      const { data: existing } = await supabase
        .from('ingredients')
        .select('id')
        .eq('id', id)
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .single();


      if (!existing) {
        throw new AppError(404, 'Ingredient not found');
      }


      const { data, error } = await supabase
        .from('ingredients')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          product_families (id, name),
          suppliers (id, name),
          units!ingredients_unit_id_fkey (id, name, abbreviation)
        `)
        .single();


      if (error) throw error;


      res.json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error updating ingredient:', error);
      res.status(500).json({ error: 'Failed to update ingredient' });
    }
  }


  async delete(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // Soft delete
      const { error } = await supabase
        .from('ingredients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .in('organization_id', orgIds);


      if (error) throw error;


      res.json({ message: 'Ingredient deleted successfully' });
    } catch (error) {
      logger.error('Error deleting ingredient:', error);
      res.status(500).json({ error: 'Failed to delete ingredient' });
    }
  }


  async getLowStock(req: AuthRequest, res: Response): Promise {
    try {
      const orgIds = req.user!.organizationIds;


      const { data, error } = await supabase
        .from('ingredients')
        .select(`
          *,
          product_families (name),
          suppliers (name),
          units!ingredients_unit_id_fkey (abbreviation)
        `)
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .filter('stock_current', 'lte', 'stock_min')
        .order('stock_current', { ascending: true });


      if (error) throw error;


      res.json({ data, total: data?.length || 0 });
    } catch (error) {
      logger.error('Error fetching low stock ingredients:', error);
      res.status(500).json({ error: 'Failed to fetch low stock ingredients' });
    }
  }
}
```


#### Tarea 3.2: Routes


`backend/src/routes/ingredients.routes.ts`:
```typescript
import { Router } from 'express';
import { IngredientsController } from '@/controllers/ingredients.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { createIngredientSchema, updateIngredientSchema } from '@/utils/validators';


const router = Router();
const controller = new IngredientsController();


router.use(authMiddleware);


router.get('/', controller.getAll);
router.get('/low-stock', controller.getLowStock);
router.get('/:id', controller.getById);
router.post('/', validate(createIngredientSchema), controller.create);
router.patch('/:id', validate(updateIngredientSchema), controller.update);
router.delete('/:id', controller.delete);


export default router;
```


#### Tarea 3.3: Validators


`backend/src/utils/validators.ts` (añadir):
```typescript
export const createIngredientSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name required'),
    description: z.string().optional(),
    family_id: z.string().uuid().optional(),
    supplier_id: z.string().uuid().optional(),
    cost_price: z.number().min(0),
    unit_id: z.string().uuid(),
    stock_current: z.number().min(0).optional(),
    stock_min: z.number().min(0).optional(),
    barcode: z.string().max(100).optional(),
  }),
});


export const updateIngredientSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    family_id: z.string().uuid().optional(),
    supplier_id: z.string().uuid().optional(),
    cost_price: z.number().min(0).optional(),
    unit_id: z.string().uuid().optional(),
    stock_current: z.number().min(0).optional(),
    stock_min: z.number().min(0).optional(),
    barcode: z.string().max(100).optional(),
  }),
});
```


---


### **DÍA 4: Tests Backend**


#### Tarea 4.1: Tests de familias


`backend/tests/integration/product-families.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '@/index';


describe('Product Families API', () => {
  let token: string;
  let orgId: string;
  let familyId: string;


  beforeAll(async () => {
    // Register and get token
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `family-test-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'Family Test',
        organizationName: 'Family Test Org',
      });


    token = response.body.token;
    orgId = response.body.organization.id;
  });


  describe('POST /api/v1/product-families', () => {
    it('should create a new family', async () => {
      const response = await request(app)
        .post('/api/v1/product-families')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Carnes',
          description: 'Productos cárnicos',
          safety_buffer_pct: 1.05,
        });


      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: 'Carnes',
        safety_buffer_pct: 1.05,
      });


      familyId = response.body.data.id;
    });


    it('should reject duplicate family name', async () => {
      await request(app)
        .post('/api/v1/product-families')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Duplicado', safety_buffer_pct: 1.10 });


      const response = await request(app)
        .post('/api/v1/product-families')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Duplicado', safety_buffer_pct: 1.10 });


      expect(response.status).toBe(409);
    });


    it('should use default buffer if not provided', async () => {
      const response = await request(app)
        .post('/api/v1/product-families')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sin Buffer' });


      expect(response.body.data.safety_buffer_pct).toBe(1.10);
    });
  });


  describe('GET /api/v1/product-families', () => {
    it('should list all families for organization', async () => {
      const response = await request(app)
        .get('/api/v1/product-families')
        .set('Authorization', `Bearer ${token}`);


      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThan(0);
    });
  });


  describe('PATCH /api/v1/product-families/:id', () => {
    it('should update family buffer', async () => {
      const response = await request(app)
        .patch(`/api/v1/product-families/${familyId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ safety_buffer_pct: 1.15 });


      expect(response.status).toBe(200);
      expect(response.body.data.safety_buffer_pct).toBe(1.15);
    });
  });


  describe('DELETE /api/v1/product-families/:id', () => {
    it('should prevent deletion if has ingredients', async () => {
      // Create ingredient first
      const unitResponse = await request(app)
        .get('/api/v1/units')
        .set('Authorization', `Bearer ${token}`);
      
      const unitId = unitResponse.body.data[0].id;


      await request(app)
        .post('/api/v1/ingredients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Ingredient',
          family_id: familyId,
          unit_id: unitId,
          cost_price: 5.0,
        });


      const response = await request(app)
        .delete(`/api/v1/product-families/${familyId}`)
        .set('Authorization', `Bearer ${token}`);


      expect(response.status).toBe(400);
      expect(response.body.error).toContain('associated ingredients');
    });
  });
});
```


#### Tarea 4.2: Tests de ingredientes


`backend/tests/integration/ingredients.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '@/index';


describe('Ingredients API', () => {
  let token: string;
  let familyId: string;
  let unitId: string;
  let ingredientId: string;


  beforeAll(async () => {
    // Setup
    const authResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `ingredient-test-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'Ingredient Test',
        organizationName: 'Ingredient Test Org',
      });


    token = authResponse.body.token;


    // Create family
    const familyResponse = await request(app)
      .post('/api/v1/product-families')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Family', safety_buffer_pct: 1.10 });


    familyId = familyResponse.body.data.id;


    // Get unit
    const unitsResponse = await request(app)
      .get('/api/v1/units')
      .set('Authorization', `Bearer ${token}`);


    unitId = unitsResponse.body.data.find((u: any) => u.abbreviation === 'kg').id;
  });


  describe('POST /api/v1/ingredients', () => {
    it('should create ingredient with all fields', async () => {
      const response = await request(app)
        .post('/api/v1/ingredients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Tomate',
          description: 'Tomate fresco',
          family_id: familyId,
          cost_price: 2.50,
          unit_id: unitId,
          stock_current: 10,
          stock_min: 5,
          barcode: '123456789',
        });


      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: 'Tomate',
        cost_price: 2.50,
        stock_current: 10,
      });


      ingredientId = response.body.data.id;
    });


    it('should default stock to 0 if not provided', async () => {
      const response = await request(app)
        .post('/api/v1/ingredients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Lechuga',
          family_id: familyId,
          cost_price: 1.50,
          unit_id: unitId,
        });


      expect(response.body.data.stock_current).toBe(0);
      expect(response.body.data.stock_min).toBe(0);
    });
  });


  describe('GET /api/v1/ingredients', () => {
    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/ingredients?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);


      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
    });


    it('should filter by family', async () => {
      const response = await request(app)
        .get(`/api/v1/ingredients?family_id=${familyId}`)
        .set('Authorization', `Bearer ${token}`);


      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item.family_id).toBe(familyId);
      });
    });


    it('should search by name', async () => {
      const response = await request(app)
        .get('/api/v1/ingredients?search=Tomate')
        .set('Authorization', `Bearer ${token}`);


      expect(response.status).toBe(200);
      expect(response.body.data[0].name).toContain('Tomate');
    });
  });


  describe('GET /api/v1/ingredients/low-stock', () => {
    it('should return ingredients below minimum stock', async () => {
      // Create low stock ingredient
      await request(app)
        .post('/api/v1/ingredients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Low Stock Item',
          family_id: familyId,
          cost_price: 1.0,
          unit_id: unitId,
          stock_current: 2,
          stock_min: 10,
        });


      const response = await request(app)
        .get('/api/v1/ingredients/low-stock')
        .set('Authorization', `Bearer ${token}`);


      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      response.body.data.forEach((item: any) => {
        expect(item.stock_current).toBeLessThanOrEqual(item.stock_min);
      });
    });
  });


  describe('PATCH /api/v1/ingredients/:id', () => {
    it('should update stock levels', async () => {
      const response = await request(app)
        .patch(`/api/v1/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stock_current: 20 });


      expect(response.status).toBe(200);
      expect(response.body.data.stock_current).toBe(20);
    });


    it('should update cost price', async () => {
      const response = await request(app)
        .patch(`/api/v1/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ cost_price: 3.00 });


      expect(response.body.data.cost_price).toBe(3.00);
    });
  });


  describe('DELETE /api/v1/ingredients/:id', () => {
    it('should soft delete ingredient', async () => {
      const response = await request(app)
        .delete(`/api/v1/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${token}`);


      expect(response.status).toBe(200);


      // Verify it's not returned in list
      const listResponse = await request(app)
        .get('/api/v1/ingredients')
        .set('Authorization', `Bearer ${token}`);


      const found = listResponse.body.data.find((i: any) => i.id === ingredientId);
      expect(found).toBeUndefined();
    });
  });
});
```


---


### **DÍA 5: Frontend - UI de Ingredientes**


#### Tarea 5.1: Service layer


`frontend/src/services/ingredients.service.ts`:
```typescript
import { api } from './api';


export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  family_id?: string;
  supplier_id?: string;
  cost_price: number;
  unit_id: string;
  stock_current: number;
  stock_min: number;
  barcode?: string;
  product_families?: {
    id: string;
    name: string;
    safety_buffer_pct: number;
  };
  suppliers?: {
    id: string;
    name: string;
  };
  units: {
    id: string;
    name: string;
    abbreviation: string;
  };
}


export interface CreateIngredientDto {
  name: string;
  description?: string;
  family_id?: string;
  supplier_id?: string;
  cost_price: number;
  unit_id: string;
  stock_current?: number;
  stock_min?: number;
  barcode?: string;
}


export const ingredientsService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    family_id?: string;
    supplier_id?: string;
  }) {
    const response = await api.get('/ingredients', { params });
    return response.data;
  },


  async getById(id: string) {
    const response = await api.get(`/ingredients/${id}`);
    return response.data.data;
  },


  async create(data: CreateIngredientDto) {
    const response = await api.post('/ingredients', data);
    return response.data.data;
  },


  async update(id: string, data: Partial) {
    const response = await api.patch(`/ingredients/${id}`, data);
    return response.data.data;
  },


  async delete(id: string) {
    await api.delete(`/ingredients/${id}`);
  },


  async getLowStock() {
    const response = await api.get('/ingredients/low-stock');
    return response.data.data;
  },
};
```


#### Tarea 5.2: Hook personalizado


`frontend/src/hooks/useIngredients.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ingredientsService, CreateIngredientDto } from '@/services/ingredients.service';
import { useToast } from '@/components/ui/use-toast';


export function useIngredients(params?: {
  page?: number;
  limit?: number;
  search?: string;
  family_id?: string;
}) {
  return useQuery({
    queryKey: ['ingredients', params],
    queryFn: () => ingredientsService.getAll(params),
  });
}


export function useIngredient(id: string) {
  return useQuery({
    queryKey: ['ingredient', id],
    queryFn: () => ingredientsService.getById(id),
    enabled: !!id,
  });
}


export function useCreateIngredient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();


  return useMutation({
    mutationFn: (data: CreateIngredientDto) => ingredientsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      toast({ title: 'Ingrediente creado exitosamente' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al crear ingrediente',
        description: error.response?.data?.error || 'Error desconocido',
        variant: 'destructive',
      });
    },
  });
}


export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();


  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial }) =>
      ingredientsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      toast({ title: 'Ingrediente actualizado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al actualizar',
        description: error.response?.data?.error,
        variant: 'destructive',
      });
    },
  });
}


export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();


  return useMutation({
    mutationFn: (id: string) => ingredientsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      toast({ title: 'Ingrediente eliminado' });
    },
  });
}


export function useLowStockIngredients() {
  return useQuery({
    queryKey: ['ingredients', 'low-stock'],
    queryFn: () => ingredientsService.getLowStock(),
  });
}
```


#### Tarea 5.3: Página de ingredientes


`frontend/src/pages/Ingredients.tsx`:
```tsx
import { useState } from 'react';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { useIngredients, useLowStockIngredients } from '@/hooks/useIngredients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IngredientsList } from '@/components/ingredients/IngredientsList';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';


export default function Ingredients() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);


  const { data, isLoading } = useIngredients({ page, limit: 20, search });
  const { data: lowStock } = useLowStockIngredients();


  return (
    
      {/* Header */}
      
        
          Ingredientes
          
            Gestiona tu catálogo de productos
          
        


        
          
            
              
              Nuevo Ingrediente
            
          
          
            
              Crear Ingrediente
            
            <IngredientForm onSuccess={() => setIsCreateOpen(false)} />
          
        
      


      {/* Low Stock Alert */}
      {lowStock && lowStock.length > 0 && (
        
          
          
            {lowStock.length} productos tienen stock bajo el mínimo
          
        
      )}


      {/* Search Bar */}
      
        
          
          <Input
            placeholder="Buscar ingredientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        
        {/* TODO: Filtros por familia y proveedor */}
      


      {/* List */}
      
    
  );
}
```


#### Tarea 5.4: Componente de lista


`frontend/src/components/ingredients/IngredientsList.tsx`:
```tsx
import { useState } from 'react';
import { Edit, Trash2, Package } from 'lucide-react';
import { Ingredient } from '@/services/ingredients.service';
import { useDeleteIngredient } from '@/hooks/useIngredients';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';


interface IngredientsListProps {
  data: Ingredient[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  isLoading: boolean;
  onPageChange: (page: number) => void;
}


export function IngredientsList({
  data,
  pagination,
  isLoading,
  onPageChange,
}: IngredientsListProps) {
  const [deleteId, setDeleteId] = useState(null);
  const deleteMutation = useDeleteIngredient();


  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };


  if (isLoading) {
    return Cargando...;
  }


  return (
    <>
      
        
          
            
              Nombre
              Familia
              Proveedor
              Stock
              Precio
              Acciones
            
          
          
            {data.map((ingredient) => (
              
                
                  
                    
                    {ingredient.name}
                  
                
                
                  {ingredient.product_families?.name || '-'}
                
                
                  {ingredient.suppliers?.name || '-'}
                
                
                  
                    
                      {ingredient.stock_current} {ingredient.units.abbreviation}
                    
                    {ingredient.stock_current <= ingredient.stock_min && (
                      
                        Bajo
                      
                    )}
                  
                
                
                  {formatCurrency(ingredient.cost_price)}
                
                
                  
                    
                      
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(ingredient.id)}
                    >
                      
                    
                  
                
              
            ))}
          
        
      


      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        
          
            Mostrando {data.length} de {pagination.total} ingredientes
          
          
            <Button
              variant="outline"
              disabled={pagination.page === 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Anterior
            
            <Button
              variant="outline"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Siguiente
            
          
        
      )}


      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        
          
            ¿Eliminar ingrediente?
            
              Esta acción no se puede deshacer. El ingrediente será marcado como
              eliminado.
            
          
          
            Cancelar
            
              Eliminar
            
          
        
      
    </>
  );
}
```


---


## ✅ DEFINITION OF DONE - SPRINT 02


- [ ] Migraciones de unidades y familias aplicadas
- [ ] CRUD de familias implementado y testeado (≥90% coverage)
- [ ] CRUD de ingredientes implementado y testeado (≥90% coverage)
- [ ] Safety Buffer por familia funcional
- [ ] Sistema de stock mínimo implementado
- [ ] Endpoint de low-stock funcional
- [ ] Frontend de ingredientes completo
- [ ] Tests E2E de flujo completo
- [ ] CI passing
- [ ] Documentación actualizada


---


¿Continúo con **Sprint 03: Proveedores & Lead Time**?Si0:332 / 2🏗️ SPRINT 03-06 - PLANIFICACIÓN COMPLETA


📋 SPRINT 03: Proveedores & Lead Time 🚚
