# SPRINT 03: Proveedores & Lead Time 🚚


**Duración:** 1 semana (5 días hábiles)  
**Objetivo:** Implementar gestión completa de proveedores con algoritmo de estimación de fecha de entrega (Lead Time + Cut-off Time + Delivery Days).


---


## 📊 MÉTRICAS DE ÉXITO


- ✅ Cobertura de tests ≥ 90%
- ✅ CRUD de proveedores funcional
- ✅ Algoritmo de delivery date con tests exhaustivos
- ✅ Widget de countdown implementado
- ✅ Validación de días de reparto


---


## 🎯 TAREAS DETALLADAS


### **DÍA 1: Backend - CRUD de Proveedores**


#### Tarea 1.1: Controller de proveedores


`backend/src/controllers/suppliers.controller.ts`:
```typescript
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';


export class SuppliersController {
  async getAll(req: AuthRequest, res: Response): Promise {
    try {
      const orgIds = req.user!.organizationIds;
      const { search = '' } = req.query;


      let query = supabase
        .from('suppliers')
        .select('*', { count: 'exact' })
        .in('organization_id', orgIds)
        .is('deleted_at', null);


      if (search) {
        query = query.ilike('name', `%${search}%`);
      }


      const { data, error, count } = await query.order('name');


      if (error) throw error;


      res.json({ data, total: count || 0 });
    } catch (error) {
      logger.error('Error fetching suppliers:', error);
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  }


  async getById(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .single();


      if (error || !data) {
        throw new AppError(404, 'Supplier not found');
      }


      res.json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error fetching supplier:', error);
      res.status(500).json({ error: 'Failed to fetch supplier' });
    }
  }


  async create(req: AuthRequest, res: Response): Promise {
    try {
      const {
        name,
        contact_email,
        contact_phone,
        lead_time_days,
        cut_off_time,
        delivery_days,
      } = req.body;


      const organizationId = req.user!.organizationIds[0];


      // Validar delivery_days
      if (delivery_days && delivery_days.length === 0) {
        throw new AppError(400, 'At least one delivery day must be specified');
      }


      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          organization_id: organizationId,
          name,
          contact_email,
          contact_phone,
          lead_time_days: lead_time_days || 2,
          cut_off_time,
          delivery_days: delivery_days || [1, 2, 3, 4, 5], // L-V por defecto
        })
        .select()
        .single();


      if (error) {
        if (error.code === '23505') {
          throw new AppError(409, 'Supplier with this name already exists');
        }
        throw error;
      }


      res.status(201).json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error creating supplier:', error);
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }


  async update(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;
      const updateData = req.body;


      // Verificar ownership
      const { data: existing } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', id)
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .single();


      if (!existing) {
        throw new AppError(404, 'Supplier not found');
      }


      const { data, error } = await supabase
        .from('suppliers')
        .update(updateData)
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
      logger.error('Error updating supplier:', error);
      res.status(500).json({ error: 'Failed to update supplier' });
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
        .eq('supplier_id', id)
        .is('deleted_at', null);


      if (count && count > 0) {
        throw new AppError(
          400,
          `Cannot delete supplier with ${count} associated ingredients`
        );
      }


      // Soft delete
      const { error } = await supabase
        .from('suppliers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .in('organization_id', orgIds);


      if (error) throw error;


      res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error deleting supplier:', error);
      res.status(500).json({ error: 'Failed to delete supplier' });
    }
  }
}
```


#### Tarea 1.2: Routes


`backend/src/routes/suppliers.routes.ts`:
```typescript
import { Router } from 'express';
import { SuppliersController } from '@/controllers/suppliers.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { createSupplierSchema, updateSupplierSchema } from '@/utils/validators';


const router = Router();
const controller = new SuppliersController();


router.use(authMiddleware);


router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', validate(createSupplierSchema), controller.create);
router.patch('/:id', validate(updateSupplierSchema), controller.update);
router.delete('/:id', controller.delete);


export default router;
```


#### Tarea 1.3: Validators


`backend/src/utils/validators.ts` (añadir):
```typescript
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;


export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().optional(),
    lead_time_days: z.number().int().min(0).max(30).optional(),
    cut_off_time: z.string().regex(timeRegex, 'Invalid time format (HH:MM:SS)').optional(),
    delivery_days: z
      .array(z.number().int().min(1).max(7))
      .min(1, 'At least one delivery day required')
      .optional(),
  }),
});


export const updateSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().optional(),
    lead_time_days: z.number().int().min(0).max(30).optional(),
    cut_off_time: z.string().regex(timeRegex).optional(),
    delivery_days: z.array(z.number().int().min(1).max(7)).min(1).optional(),
  }),
});
```


---


### **DÍA 2: Algoritmo de Estimación de Entrega**


#### Tarea 2.1: Service de cálculo de delivery


`backend/src/services/delivery-estimator.service.ts`:
```typescript
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';


interface Supplier {
  id: string;
  cut_off_time: string | null;
  lead_time_days: number;
  delivery_days: number[];
}


export class DeliveryEstimatorService {
  /**
   * Calcula fecha estimada de entrega
   * 
   * ALGORITMO:
   * 1. Si tiene cut_off_time y ya pasó → empezar desde mañana
   * 2. Sumar lead_time_days (solo días hábiles L-V)
   * 3. Buscar siguiente delivery_day válido (debe ser día completo posterior)
   */
  async estimateDeliveryDate(
    supplierId: string,
    orderDateTime: Date = new Date()
  ): Promise {
    try {
      // 1. Obtener datos del proveedor
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


      logger.info(`Calculating delivery for supplier ${supplierId}`, {
        orderDateTime: currentDate.toISOString(),
        cutOffTime: supplier.cut_off_time,
        leadTimeDays: supplier.lead_time_days,
        deliveryDays: supplier.delivery_days,
      });


      // 2. Verificar cut-off time
      if (supplier.cut_off_time && currentTime >= supplier.cut_off_time) {
        currentDate.setDate(currentDate.getDate() + 1);
        logger.info('Cut-off time passed, starting from tomorrow');
      }


      // 3. Sumar lead time (solo días hábiles)
      const leadTimeDays = supplier.lead_time_days || 2;
      let daysAdded = 0;


      while (daysAdded < leadTimeDays) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dayOfWeek = currentDate.getDay();


        // Saltar fines de semana (0=Dom, 6=Sáb)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          daysAdded++;
        }
      }


      logger.info(`After adding lead time: ${currentDate.toISOString()}`);


      // 4. Buscar siguiente día de reparto válido
      const deliveryDays = supplier.delivery_days || [1, 2, 3, 4, 5];
      let attempts = 0;
      const maxAttempts = 14; // Evitar loop infinito


      while (attempts < maxAttempts) {
        let dayOfWeek = currentDate.getDay();
        
        // Convertir domingo (0) a 7
        if (dayOfWeek === 0) {
          dayOfWeek = 7;
        }


        if (deliveryDays.includes(dayOfWeek)) {
          logger.info(`Found valid delivery day: ${currentDate.toISOString()}`);
          break;
        }


        currentDate.setDate(currentDate.getDate() + 1);
        attempts++;
      }


      if (attempts >= maxAttempts) {
        throw new Error('Could not find valid delivery date within 14 days');
      }


      // Establecer hora a medianoche para claridad
      currentDate.setHours(0, 0, 0, 0);


      return currentDate;
    } catch (error) {
      logger.error('Error estimating delivery date:', error);
      throw error;
    }
  }


  /**
   * Calcula tiempo restante hasta cut-off time
   * Retorna minutos restantes (negativo si ya pasó)
   */
  calculateTimeUntilCutoff(
    cutOffTime: string,
    currentTime: Date = new Date()
  ): number {
    const [hours, minutes, seconds] = cutOffTime.split(':').map(Number);
    
    const cutoff = new Date(currentTime);
    cutoff.setHours(hours, minutes, seconds, 0);


    const diff = cutoff.getTime() - currentTime.getTime();
    return Math.floor(diff / 1000 / 60); // Minutos
  }


  /**
   * Verifica si hoy es día de reparto para un proveedor
   */
  isDeliveryDayToday(deliveryDays: number[]): boolean {
    let today = new Date().getDay();
    if (today === 0) today = 7; // Domingo → 7
    
    return deliveryDays.includes(today);
  }
}
```


#### Tarea 2.2: Endpoint de estimación


`backend/src/controllers/suppliers.controller.ts` (añadir método):
```typescript
import { DeliveryEstimatorService } from '@/services/delivery-estimator.service';


export class SuppliersController {
  // ... métodos existentes ...


  async estimateDelivery(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const { order_date } = req.query;


      const estimator = new DeliveryEstimatorService();
      
      const orderDate = order_date 
        ? new Date(order_date as string)
        : new Date();


      const estimatedDate = await estimator.estimateDeliveryDate(id, orderDate);


      res.json({
        supplier_id: id,
        order_date: orderDate.toISOString(),
        estimated_delivery: estimatedDate.toISOString(),
      });
    } catch (error) {
      logger.error('Error estimating delivery:', error);
      res.status(500).json({ error: 'Failed to estimate delivery date' });
    }
  }


  async getWithCutoffStatus(req: AuthRequest, res: Response): Promise {
    try {
      const orgIds = req.user!.organizationIds;


      const { data: suppliers, error } = await supabase
        .from('suppliers')
        .select('*')
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .not('cut_off_time', 'is', null);


      if (error) throw error;


      const estimator = new DeliveryEstimatorService();
      const now = new Date();


      const suppliersWithStatus = suppliers?.map((supplier) => {
        const minutesUntilCutoff = supplier.cut_off_time
          ? estimator.calculateTimeUntilCutoff(supplier.cut_off_time, now)
          : null;


        const isDeliveryDay = estimator.isDeliveryDayToday(supplier.delivery_days);


        return {
          ...supplier,
          cutoff_status: {
            minutes_until_cutoff: minutesUntilCutoff,
            is_delivery_day: isDeliveryDay,
            is_urgent: minutesUntilCutoff !== null && 
                       minutesUntilCutoff > 0 && 
                       minutesUntilCutoff < 120, // < 2 horas
            has_passed: minutesUntilCutoff !== null && minutesUntilCutoff < 0,
          },
        };
      });


      res.json({ data: suppliersWithStatus });
    } catch (error) {
      logger.error('Error fetching suppliers with cutoff status:', error);
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  }
}
```


`backend/src/routes/suppliers.routes.ts` (añadir rutas):
```typescript
router.get('/:id/estimate-delivery', controller.estimateDelivery);
router.get('/cutoff-status/all', controller.getWithCutoffStatus);
```


---


### **DÍA 3: Tests del Algoritmo**


#### Tarea 3.1: Tests unitarios de DeliveryEstimator


`backend/tests/unit/delivery-estimator.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeliveryEstimatorService } from '@/services/delivery-estimator.service';
import { supabase } from '@/config/supabase';


// Mock Supabase
vi.mock('@/config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));


describe('DeliveryEstimatorService', () => {
  let service: DeliveryEstimatorService;


  beforeEach(() => {
    service = new DeliveryEstimatorService();
  });


  describe('estimateDeliveryDate', () => {
    it('should add lead time and find next delivery day', async () => {
      // Mock supplier: Lead time 2 días, reparto L-M-X-J-V
      const mockSupplier = {
        cut_off_time: null,
        lead_time_days: 2,
        delivery_days: [1, 2, 3, 4, 5],
      };


      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSupplier,
              error: null,
            }),
          }),
        }),
      } as any);


      // Pedido: Miércoles 10:00
      const orderDate = new Date('2025-01-22T10:00:00Z'); // Miércoles
      const result = await service.estimateDeliveryDate('supplier-id', orderDate);


      // Lead time: +2 días hábiles = Viernes
      // Siguiente día de reparto válido: Viernes (mismo día)
      expect(result.getDay()).toBe(5); // Viernes
    });


    it('should skip to next day if cut-off time passed', async () => {
      const mockSupplier = {
        cut_off_time: '11:00:00',
        lead_time_days: 2,
        delivery_days: [1, 2, 3, 4, 5],
      };


      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSupplier,
              error: null,
            }),
          }),
        }),
      } as any);


      // Pedido: Miércoles 12:00 (pasó el cut-off de 11:00)
      const orderDate = new Date('2025-01-22T12:00:00Z');
      const result = await service.estimateDeliveryDate('supplier-id', orderDate);


      // Empieza desde Jueves + 2 días = Lunes siguiente
      expect(result.getDay()).toBe(1); // Lunes
    });


    it('should skip weekends when adding lead time', async () => {
      const mockSupplier = {
        cut_off_time: null,
        lead_time_days: 3,
        delivery_days: [1, 2, 3, 4, 5],
      };


      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSupplier,
              error: null,
            }),
          }),
        }),
      } as any);


      // Pedido: Jueves
      const orderDate = new Date('2025-01-23T10:00:00Z'); // Jueves
      const result = await service.estimateDeliveryDate('supplier-id', orderDate);


      // Jueves + 3 días hábiles = Martes (salta fin de semana)
      expect(result.getDay()).toBe(2); // Martes
    });


    it('should find next valid delivery day if availability falls on non-delivery day', async () => {
      const mockSupplier = {
        cut_off_time: null,
        lead_time_days: 2,
        delivery_days: [1, 3, 5], // Solo L-X-V
      };


      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSupplier,
              error: null,
            }),
          }),
        }),
      } as any);


      // Pedido: Lunes
      const orderDate = new Date('2025-01-20T10:00:00Z'); // Lunes
      const result = await service.estimateDeliveryDate('supplier-id', orderDate);


      // Lunes + 2 días = Miércoles (es día de reparto, OK)
      expect(result.getDay()).toBe(3); // Miércoles
    });


    it('EDGE CASE: should handle delivery only on Mondays', async () => {
      const mockSupplier = {
        cut_off_time: null,
        lead_time_days: 1,
        delivery_days: [1], // Solo Lunes
      };


      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSupplier,
              error: null,
            }),
          }),
        }),
      } as any);


      // Pedido: Viernes
      const orderDate = new Date('2025-01-24T10:00:00Z'); // Viernes
      const result = await service.estimateDeliveryDate('supplier-id', orderDate);


      // Viernes + 1 día hábil = Lunes (es día de reparto)
      expect(result.getDay()).toBe(1); // Lunes
    });
  });


  describe('calculateTimeUntilCutoff', () => {
    it('should return positive minutes if cutoff is in the future', () => {
      const cutoffTime = '14:00:00';
      const currentTime = new Date('2025-01-22T12:00:00Z');


      const minutes = service.calculateTimeUntilCutoff(cutoffTime, currentTime);


      expect(minutes).toBe(120); // 2 horas
    });


    it('should return negative minutes if cutoff has passed', () => {
      const cutoffTime = '11:00:00';
      const currentTime = new Date('2025-01-22T12:00:00Z');


      const minutes = service.calculateTimeUntilCutoff(cutoffTime, currentTime);


      expect(minutes).toBeLessThan(0);
    });
  });


  describe('isDeliveryDayToday', () => {
    it('should return true if today is a delivery day', () => {
      const today = new Date().getDay();
      const deliveryDays = today === 0 ? [7] : [today];


      const result = service.isDeliveryDayToday(deliveryDays);


      expect(result).toBe(true);
    });


    it('should return false if today is not a delivery day', () => {
      const today = new Date().getDay();
      const otherDay = today === 1 ? 2 : 1;
      const deliveryDays = [otherDay];


      const result = service.isDeliveryDayToday(deliveryDays);


      expect(result).toBe(false);
    });
  });
});
```


#### Tarea 3.2: Tests de integración


`backend/tests/integration/suppliers.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '@/index';


describe('Suppliers API', () => {
  let token: string;
  let supplierId: string;


  beforeAll(async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `supplier-test-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'Supplier Test',
        organizationName: 'Supplier Test Org',
      });


    token = response.body.token;
  });


  describe('POST /api/v1/suppliers', () => {
    it('should create supplier with delivery schedule', async () => {
      const response = await request(app)
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Proveedor ABC',
          contact_email: 'contacto@abc.com',
          contact_phone: '+34 600 000 000',
          lead_time_days: 2,
          cut_off_time: '11:00:00',
          delivery_days: [1, 3, 5], // L-X-V
        });


      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: 'Proveedor ABC',
        lead_time_days: 2,
        cut_off_time: '11:00:00',
        delivery_days: [1, 3, 5],
      });


      supplierId = response.body.data.id;
    });


    it('should use defaults if not provided', async () => {
      const response = await request(app)
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Proveedor Simple',
        });


      expect(response.body.data.lead_time_days).toBe(2);
      expect(response.body.data.delivery_days).toEqual([1, 2, 3, 4, 5]);
    });


    it('should reject invalid time format', async () => {
      const response = await request(app)
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Time',
          cut_off_time: '25:00:00', // Hora inválida
        });


      expect(response.status).toBe(400);
    });


    it('should reject empty delivery_days array', async () => {
      const response = await request(app)
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'No Delivery Days',
          delivery_days: [],
        });


      expect(response.status).toBe(400);
    });
  });


  describe('GET /api/v1/suppliers/:id/estimate-delivery', () => {
    it('should estimate delivery date', async () => {
      const response = await request(app)
        .get(`/api/v1/suppliers/${supplierId}/estimate-delivery`)
        .set('Authorization', `Bearer ${token}`)
        .query({ order_date: '2025-01-22T10:00:00Z' });


      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('estimated_delivery');
      
      const estimatedDate = new Date(response.body.estimated_delivery);
      expect(estimatedDate).toBeInstanceOf(Date);
    });
  });


  describe('GET /api/v1/suppliers/cutoff-status/all', () => {
    it('should return suppliers with cutoff status', async () => {
      const response = await request(app)
        .get('/api/v1/suppliers/cutoff-status/all')
        .set('Authorization', `Bearer ${token}`);


      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 0) {
        const supplier = response.body.data[0];
        expect(supplier.cutoff_status).toHaveProperty('minutes_until_cutoff');
        expect(supplier.cutoff_status).toHaveProperty('is_urgent');
      }
    });
  });
});
```


---


### **DÍA 4: Frontend - UI de Proveedores**


#### Tarea 4.1: Service


`frontend/src/services/suppliers.service.ts`:
```typescript
import { api } from './api';


export interface Supplier {
  id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  lead_time_days: number;
  cut_off_time?: string;
  delivery_days: number[];
  cutoff_status?: {
    minutes_until_cutoff: number | null;
    is_delivery_day: boolean;
    is_urgent: boolean;
    has_passed: boolean;
  };
}


export interface CreateSupplierDto {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  lead_time_days?: number;
  cut_off_time?: string;
  delivery_days?: number[];
}


export const suppliersService = {
  async getAll(search?: string) {
    const response = await api.get(
      '/suppliers',
      { params: { search } }
    );
    return response.data;
  },


  async getById(id: string) {
    const response = await api.get(`/suppliers/${id}`);
    return response.data.data;
  },


  async create(data: CreateSupplierDto) {
    const response = await api.post('/suppliers', data);
    return response.data.data;
  },


  async update(id: string, data: Partial) {
    const response = await api.patch(`/suppliers/${id}`, data);
    return response.data.data;
  },


  async delete(id: string) {
    await api.delete(`/suppliers/${id}`);
  },


  async estimateDelivery(id: string, orderDate?: string) {
    const response = await api.get(`/suppliers/${id}/estimate-delivery`, {
      params: { order_date: orderDate },
    });
    return response.data;
  },


  async getWithCutoffStatus() {
    const response = await api.get(
      '/suppliers/cutoff-status/all'
    );
    return response.data.data;
  },
};
```


#### Tarea 4.2: Componente de formulario


`frontend/src/components/suppliers/SupplierForm.tsx`:
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateSupplier } from '@/hooks/useSuppliers';


const formSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  lead_time_days: z.coerce.number().int().min(0).max(30),
  cut_off_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().or(z.literal('')),
  delivery_days: z.array(z.number()).min(1, 'Selecciona al menos un día'),
});


type FormData = z.infer;


const DAYS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 7, label: 'D' },
];


interface SupplierFormProps {
  onSuccess?: () => void;
}


export function SupplierForm({ onSuccess }: SupplierFormProps) {
  const createMutation = useCreateSupplier();


  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lead_time_days: 2,
      delivery_days: [1, 2, 3, 4, 5],
    },
  });


  const selectedDays = watch('delivery_days');


  const toggleDay = (day: number) => {
    const current = selectedDays || [];
    if (current.includes(day)) {
      setValue('delivery_days', current.filter((d) => d !== day));
    } else {
      setValue('delivery_days', [...current, day].sort());
    }
  };


  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      cut_off_time: data.cut_off_time ? `${data.cut_off_time}:00` : undefined,
      contact_email: data.contact_email || undefined,
    };


    await createMutation.mutateAsync(payload);
    onSuccess?.();
  };


  return (
    
      
        Nombre del proveedor *
        
        {errors.name && (
          {errors.name.message}
        )}
      


      
        
          Email de contacto
          
          {errors.contact_email && (
            {errors.contact_email.message}
          )}
        


        
          Teléfono
          
        
      


      
        
          Tiempo de entrega (días) *
          
          {errors.lead_time_days && (
            {errors.lead_time_days.message}
          )}
        


        
          Hora de corte (opcional)
          
          
            Hora límite para pedidos del día
          
        
      


      
        Días de reparto *
        
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`flex h-10 w-10 items-center justify-center rounded-md border-2 font-medium transition-colors ${
                selectedDays?.includes(day.value)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input hover:bg-accent'
              }`}
            >
              {day.label}
            
          ))}
        
        {errors.delivery_days && (
          {errors.delivery_days.message}
        )}
      


      
        {createMutation.isPending ? 'Creando...' : 'Crear Proveedor'}
      
    
  );
}
```


---


### **DÍA 5: Widget de Countdown**


#### Tarea 5.1: Componente de Countdown


`frontend/src/components/dashboard/SupplierCountdown.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useSuppliersWithCutoff } from '@/hooks/useSuppliers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


export function SupplierCountdown() {
  const { data: suppliers } = useSuppliersWithCutoff();
  const [currentTime, setCurrentTime] = useState(new Date());


  // Actualizar cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60 segundos


    return () => clearInterval(interval);
  }, []);


  // Filtrar solo proveedores urgentes o que hoy es día de reparto
  const urgentSuppliers = suppliers?.filter(
    (s) =>
      s.cutoff_status?.is_delivery_day &&
      s.cutoff_status?.minutes_until_cutoff !== null &&
      s.cutoff_status.minutes_until_cutoff > -60 && // Mostrar hasta 1h después
      s.cutoff_status.minutes_until_cutoff < 120 // Mostrar si faltan < 2h
  );


  if (!urgentSuppliers || urgentSuppliers.length === 0) {
    return null;
  }


  return (
    
      {urgentSuppliers.map((supplier) => {
        const minutes = supplier.cutoff_status!.minutes_until_cutoff!;
        const hours = Math.floor(Math.abs(minutes) / 60);
        const mins = Math.abs(minutes) % 60;


        const isUrgent = minutes > 0 && minutes < 60;
        const hasPassed = minutes < 0;


        return (
          <Card
            key={supplier.id}
            className={cn(
              'border-2',
              hasPassed && 'border-muted bg-muted/50',
              isUrgent && 'countdown-urgent border-red-500',
              !isUrgent && !hasPassed && 'border-yellow-500 bg-yellow-50'
            )}
          >
            
              
                
                {supplier.name}
                {isUrgent && (
                  
                    ¡URGENTE!
                  
                )}
              
            
            
              {hasPassed ? (
                
                  ⏱️ Hora de corte superada hace {hours}h {mins}min
                  
                  
                    Entrega estimada: Siguiente día de reparto
                  
                
              ) : (
                
                  {isUrgent ? (
                    <>
                      
                      Quedan {mins} minutos para
                      pedido de hoy
                    </>
                  ) : (
                    <>
                      Cierra pedido antes de las {supplier.cut_off_time?.slice(0, 5)}
                      
                      
                        (Faltan {hours}h {mins}min)
                      
                    </>
                  )}
                
              )}
            
          
        );
      })}
    
  );
}
```


#### Tarea 5.2: Integrar en Dashboard


`frontend/src/pages/Dashboard.tsx`:
```tsx
import { SupplierCountdown } from '@/components/dashboard/SupplierCountdown';


export default function Dashboard() {
  return (
    
      
        Dashboard
        
          Resumen de operaciones
        
      


      {/* Countdown Widget */}
      
        ⏰ Proveedores con hora de corte
        
      


      {/* Otros widgets... */}
    
  );
}
```


---


## ✅ DEFINITION OF DONE - SPRINT 03


- [ ] CRUD de proveedores completo y testeado (≥90%)
- [ ] Algoritmo de delivery date con tests exhaustivos
- [ ] Validación de días de reparto
- [ ] Endpoint de estimación funcional
- [ ] Widget de countdown implementado y actualizado en tiempo real
- [ ] Tests E2E de flujo completo
- [ ] CI passing
- [ ] Documentación actualizada


---


Continuaré con **Sprint 04** en el siguiente m


0:36
2 / 2
🏗️ SPRINT 04-06 - CONTINUACIÓN
________________


📋 SPRINT 04: Eventos & Motor de Cálculo de Demanda 📅
