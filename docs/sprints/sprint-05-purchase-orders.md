# SPRINT 05: Órdenes de Compra & Generación Automática 🛒


**Duración:** 1 semana (5 días hábiles)  
**Objetivo:** Implementar sistema completo de órdenes de compra con generación automática desde eventos, aplicando Safety Buffer y agrupación por proveedor.


---


## 📊 MÉTRICAS DE ÉXITO


- ✅ Cobertura de tests ≥ 90%
- ✅ CRUD de órdenes de compra funcional
- ✅ Generación automática desde eventos
- ✅ Safety Buffer aplicado correctamente
- ✅ Agrupación por proveedor
- ✅ Integración con delivery estimator
- ✅ Estados de PO gestionados


---


## 🎯 TAREAS DETALLADAS


### **DÍA 1: Backend - CRUD de Purchase Orders**


#### Tarea 1.1: Controller de PO


`backend/src/controllers/purchase-orders.controller.ts`:
````typescript
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';
import { DeliveryEstimatorService } from '@/services/delivery-estimator.service';


export class PurchaseOrdersController {
  async getAll(req: AuthRequest, res: Response): Promise {
    try {
      const orgIds = req.user!.organizationIds;
      const { status, supplier_id, event_id, page = 1, limit = 20 } = req.query;


      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers (
            id,
            name
          ),
          event:events (
            id,
            name,
            date_start
          )
        `, { count: 'exact' })
        .in('organization_id', orgIds)
        .is('deleted_at', null);


      // Filtros
      if (status) {
        query = query.eq('status', status);
      }
      if (supplier_id) {
        query = query.eq('supplier_id', supplier_id);
      }
      if (event_id) {
        query = query.eq('event_id', event_id);
      }


      // Paginación
      const offset = (Number(page) - 1) * Number(limit);
      query = query
        .range(offset, offset + Number(limit) - 1)
        .order('order_date', { ascending: false });


      const { data, error, count } = await query;


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
      logger.error('Error fetching purchase orders:', error);
      res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
  }


  async getById(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // PO base
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers (
            id,
            name,
            contact_email,
            contact_phone
          ),
          event:events (
            id,
            name,
            date_start
          )
        `)
        .eq('id', id)
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .single();


      if (poError || !po) {
        throw new AppError(404, 'Purchase order not found');
      }


      // Items de la PO
      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          ingredient:ingredients (
            id,
            name,
            cost_price
          ),
          unit:units (
            id,
            name,
            abbreviation
          )
        `)
        .eq('purchase_order_id', id);


      if (itemsError) throw itemsError;


      res.json({
        data: {
          ...po,
          items: items || [],
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error fetching purchase order:', error);
      res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
  }


  async create(req: AuthRequest, res: Response): Promise {
    try {
      const { supplier_id, event_id, items } = req.body;
      const organizationId = req.user!.organizationIds[0];


      // 1. Estimar fecha de entrega
      const estimator = new DeliveryEstimatorService();
      const deliveryDate = await estimator.estimateDeliveryDate(supplier_id);


      // 2. Crear PO
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          organization_id: organizationId,
          supplier_id,
          event_id,
          status: 'DRAFT',
          order_date: new Date().toISOString(),
          delivery_date_estimated: deliveryDate.toISOString(),
        })
        .select()
        .single();


      if (poError) throw poError;


      // 3. Añadir items
      if (items && items.length > 0) {
        const poItems = items.map((item: any) => ({
          purchase_order_id: po.id,
          ingredient_id: item.ingredient_id,
          quantity_ordered: item.quantity_ordered,
          unit_id: item.unit_id,
          unit_price: item.unit_price || 0,
        }));


        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(poItems);


        if (itemsError) {
          // Rollback
          await supabase.from('purchase_orders').delete().eq('id', po.id);
          throw itemsError;
        }
      }


      // 4. Calcular total
      await this.recalculateTotal(po.id);


      res.status(201).json({ data: po });
    } catch (error) {
      logger.error('Error creating purchase order:', error);
      res.status(500).json({ error: 'Failed to create purchase order' });
    }
  }


  async updateStatus(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const orgIds = req.user!.organizationIds;


      // Verificar ownership
      const { data: existing } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (!existing) {
        throw new AppError(404, 'Purchase order not found');
      }


      const { data, error } = await supabase
        .from('purchase_orders')
        .update({ status })
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
      logger.error('Error updating PO status:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }


  async receiveItems(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const { items, delivery_date_actual } = req.body;
      const orgIds = req.user!.organizationIds;


      // Verificar ownership
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('id, status')
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (!po) {
        throw new AppError(404, 'Purchase order not found');
      }


      if (po.status !== 'SENT') {
        throw new AppError(400, 'Can only receive items from SENT orders');
      }


      // 1. Actualizar cantidades recibidas
      for (const item of items) {
        const { error } = await supabase
          .from('purchase_order_items')
          .update({ quantity_received: item.quantity_received })
          .eq('id', item.id);


        if (error) throw error;


        // 2. Actualizar stock de ingrediente
        const { data: poItem } = await supabase
          .from('purchase_order_items')
          .select('ingredient_id')
          .eq('id', item.id)
          .single();


        if (poItem) {
          await supabase.rpc('increment_ingredient_stock', {
            p_ingredient_id: poItem.ingredient_id,
            p_quantity: item.quantity_received,
          });
        }
      }


      // 3. Actualizar estado de PO
      const allReceived = items.every(
        (item: any) => item.quantity_received >= item.quantity_ordered
      );


      const { data: updatedPO, error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          status: allReceived ? 'RECEIVED' : 'PARTIAL',
          delivery_date_actual: delivery_date_actual || new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();


      if (updateError) throw updateError;


      res.json({ data: updatedPO });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error receiving items:', error);
      res.status(500).json({ error: 'Failed to receive items' });
    }
  }


  async delete(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // Solo permitir eliminar DRAFT
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('status')
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (!po) {
        throw new AppError(404, 'Purchase order not found');
      }


      if (po.status !== 'DRAFT') {
        throw new AppError(400, 'Can only delete DRAFT orders');
      }


      const { error } = await supabase
        .from('purchase_orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);


      if (error) throw error;


      res.json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error deleting purchase order:', error);
      res.status(500).json({ error: 'Failed to delete purchase order' });
    }
  }


  // ========================================
  // HELPERS
  // ========================================


  private async recalculateTotal(poId: string): Promise {
    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('total_price')
      .eq('purchase_order_id', poId);


    const total = items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;


    await supabase
      .from('purchase_orders')
      .update({ total_cost: total })
      .eq('id', poId);
  }
}
````


---


### **DÍA 2: Service de Generación Automática**


#### Tarea 2.1: PurchaseOrderGenerator Service


`backend/src/services/purchase-order-generator.service.ts`:
````typescript
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { DemandCalculatorService } from './demand-calculator.service';
import { DeliveryEstimatorService } from './delivery-estimator.service';


interface GeneratedPO {
  supplier_id: string;
  supplier_name: string;
  items: {
    ingredient_id: string;
    ingredient_name: string;
    quantity_ordered: number;
    unit_id: string;
    unit_abbr: string;
    unit_price: number;
  }[];
  estimated_delivery: string;
  total_cost: number;
}


export class PurchaseOrderGeneratorService {
  /**
   * Genera órdenes de compra automáticamente desde un evento
   * 
   * PROCESO:
   * 1. Calcular demanda del evento (con Safety Buffer)
   * 2. Agrupar ingredientes por proveedor
   * 3. Crear PO por proveedor con fecha estimada
   */
  async generateFromEvent(
    eventId: string,
    organizationId: string
  ): Promise {
    try {
      logger.info(`Generating purchase orders for event ${eventId}`);


      // 1. Calcular demanda
      const demandCalculator = new DemandCalculatorService();
      const demands = await demandCalculator.calculateEventDemand(eventId);


      if (demands.length === 0) {
        logger.warn('No ingredients needed for event');
        return [];
      }


      // 2. Agrupar por proveedor
      const bySupplier = await this.groupBySupplier(demands);


      // 3. Crear POs con fecha estimada
      const deliveryEstimator = new DeliveryEstimatorService();
      const generatedPOs: GeneratedPO[] = [];


      for (const [supplierId, items] of bySupplier) {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('name')
          .eq('id', supplierId)
          .single();


        if (!supplier) continue;


        // Estimar entrega
        const deliveryDate = await deliveryEstimator.estimateDeliveryDate(supplierId);


        // Calcular total
        const totalCost = items.reduce(
          (sum, item) => sum + item.quantity_ordered * item.unit_price,
          0
        );


        // Crear PO en BD
        const { data: po, error: poError } = await supabase
          .from('purchase_orders')
          .insert({
            organization_id: organizationId,
            supplier_id: supplierId,
            event_id: eventId,
            status: 'DRAFT',
            order_date: new Date().toISOString(),
            delivery_date_estimated: deliveryDate.toISOString(),
            total_cost: totalCost,
          })
          .select()
          .single();


        if (poError) {
          logger.error(`Error creating PO for supplier ${supplierId}:`, poError);
          continue;
        }


        // Insertar items
        const poItems = items.map((item) => ({
          purchase_order_id: po.id,
          ingredient_id: item.ingredient_id,
          quantity_ordered: item.quantity_ordered,
          unit_id: item.unit_id,
          unit_price: item.unit_price,
        }));


        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(poItems);


        if (itemsError) {
          logger.error(`Error inserting items for PO ${po.id}:`, itemsError);
          // Rollback
          await supabase.from('purchase_orders').delete().eq('id', po.id);
          continue;
        }


        generatedPOs.push({
          supplier_id: supplierId,
          supplier_name: supplier.name,
          items,
          estimated_delivery: deliveryDate.toISOString(),
          total_cost: totalCost,
        });


        logger.info(`Created PO ${po.id} for supplier ${supplier.name}`);
      }


      return generatedPOs;
    } catch (error) {
      logger.error('Error generating purchase orders:', error);
      throw error;
    }
  }


  /**
   * Agrupa demandas por proveedor
   */
  private async groupBySupplier(
    demands: any[]
  ): Promise<Map> {
    const bySupplier = new Map();


    for (const demand of demands) {
      // Obtener proveedor del ingrediente
      const { data: ingredient } = await supabase
        .from('ingredients')
        .select('supplier_id, cost_price')
        .eq('id', demand.ingredient_id)
        .single();


      if (!ingredient || !ingredient.supplier_id) {
        logger.warn(`Ingredient ${demand.ingredient_id} has no supplier`);
        continue;
      }


      const supplierId = ingredient.supplier_id;


      if (!bySupplier.has(supplierId)) {
        bySupplier.set(supplierId, []);
      }


      bySupplier.get(supplierId)!.push({
        ingredient_id: demand.ingredient_id,
        ingredient_name: demand.ingredient_name,
        quantity_ordered: demand.quantity_with_buffer, // CON safety buffer
        unit_id: demand.unit_id,
        unit_abbr: demand.unit_abbr,
        unit_price: ingredient.cost_price,
      });
    }


    return bySupplier;
  }


  /**
   * Verifica disponibilidad de stock antes de crear PO
   */
  async checkStockAvailability(eventId: string): Promise {
    const demandCalculator = new DemandCalculatorService();
    const demands = await demandCalculator.calculateEventDemand(eventId);


    const missing: any[] = [];


    for (const demand of demands) {
      const { data: ingredient } = await supabase
        .from('ingredients')
        .select('stock_current')
        .eq('id', demand.ingredient_id)
        .single();


      if (!ingredient) continue;


      if (ingredient.stock_current < demand.quantity_with_buffer) {
        missing.push({
          ingredient_id: demand.ingredient_id,
          ingredient_name: demand.ingredient_name,
          needed: demand.quantity_with_buffer,
          current: ingredient.stock_current,
          shortage: demand.quantity_with_buffer - ingredient.stock_current,
        });
      }
    }


    return {
      has_sufficient_stock: missing.length === 0,
      missing_ingredients: missing,
    };
  }
}
````


#### Tarea 2.2: Endpoint de generación


`backend/src/controllers/events.controller.ts` (añadir):
````typescript
import { PurchaseOrderGeneratorService } from '@/services/purchase-order-generator.service';


export class EventsController {
  // ... métodos existentes ...


  async generatePurchaseOrders(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;
      const organizationId = orgIds[0];


      // Verificar ownership
      const { data: event } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (!event) {
        throw new AppError(404, 'Event not found');
      }


      const generator = new PurchaseOrderGeneratorService();
      
      // Verificar stock primero
      const stockCheck = await generator.checkStockAvailability(id);


      if (!stockCheck.has_sufficient_stock) {
        logger.warn(`Insufficient stock for event ${id}`);
      }


      // Generar POs
      const generatedPOs = await generator.generateFromEvent(id, organizationId);


      res.json({
        event: {
          id: event.id,
          name: event.name,
        },
        stock_status: stockCheck,
        generated_purchase_orders: generatedPOs,
        total_pos: generatedPOs.length,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error generating purchase orders:', error);
      res.status(500).json({ error: 'Failed to generate purchase orders' });
    }
  }
}
````


`backend/src/routes/events.routes.ts` (añadir):
````typescript
router.post('/:id/generate-purchase-orders', controller.generatePurchaseOrders);
````


---


### **DÍA 3: Database Function para Stock**


#### Tarea 3.1: Función SQL de incremento de stock


`supabase/migrations/20250205000001_stock_functions.sql`:
````sql
-- Función: Incrementar stock de ingrediente
CREATE OR REPLACE FUNCTION increment_ingredient_stock(
  p_ingredient_id UUID,
  p_quantity DECIMAL
)
RETURNS void AS $$
BEGIN
  UPDATE ingredients
  SET stock_current = stock_current + p_quantity
  WHERE id = p_ingredient_id;
END;
$$ LANGUAGE plpgsql;


-- Función: Decrementar stock (con validación)
CREATE OR REPLACE FUNCTION decrement_ingredient_stock(
  p_ingredient_id UUID,
  p_quantity DECIMAL
)
RETURNS void AS $$
DECLARE
  v_current_stock DECIMAL;
BEGIN
  SELECT stock_current INTO v_current_stock
  FROM ingredients
  WHERE id = p_ingredient_id;


  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for ingredient %', p_ingredient_id;
  END IF;


  UPDATE ingredients
  SET stock_current = stock_current - p_quantity
  WHERE id = p_ingredient_id;
END;
$$ LANGUAGE plpgsql;


-- Función: Registrar movimiento de stock
CREATE OR REPLACE FUNCTION register_stock_movement(
  p_organization_id UUID,
  p_ingredient_id UUID,
  p_movement_type VARCHAR,
  p_quantity DECIMAL,
  p_unit_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_purchase_order_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_movement_id UUID;
BEGIN
  INSERT INTO stock_movements (
    organization_id,
    ingredient_id,
    movement_type,
    quantity,
    unit_id,
    user_id,
    purchase_order_id,
    notes
  ) VALUES (
    p_organization_id,
    p_ingredient_id,
    p_movement_type,
    p_quantity,
    p_unit_id,
    p_user_id,
    p_purchase_order_id,
    p_notes
  )
  RETURNING id INTO v_movement_id;


  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;


COMMENT ON FUNCTION increment_ingredient_stock IS 'Aumenta el stock actual de un ingrediente';
COMMENT ON FUNCTION decrement_ingredient_stock IS 'Reduce el stock con validación de cantidad disponible';
COMMENT ON FUNCTION register_stock_movement IS 'Registra un movimiento de inventario';
````


---


### **DÍA 4: Tests**


#### Tarea 4.1: Tests del generador


`backend/tests/integration/purchase-order-generator.test.ts`:
````typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '@/index';


describe('Purchase Order Generator', () => {
  let token: string;
  let eventId: string;
  let familyId: string;
  let supplierId: string;
  let unitId: string;


  beforeAll(async () => {
    // Setup completo
    const authResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `po-gen-test-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'PO Gen Test',
        organizationName: 'PO Gen Test Org',
      });


    token = authResponse.body.token;


    // Crear familia
    const familyResponse = await request(app)
      .post('/api/v1/product-families')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Carnes', safety_buffer_pct: 1.05 });


    familyId = familyResponse.body.data.id;


    // Crear proveedor
    const supplierResponse = await request(app)
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Proveedor Test',
        lead_time_days: 2,
        delivery_days: [1, 2, 3, 4, 5],
      });


    supplierId = supplierResponse.body.data.id;


    // Obtener unidad
    const unitsResponse = await request(app)
      .get('/api/v1/units')
      .set('Authorization', `Bearer ${token}`);


    unitId = unitsResponse.body.data.find((u: any) => u.abbreviation === 'kg').id;


    // Crear ingrediente
    await request(app)
      .post('/api/v1/ingredients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Pollo',
        family_id: familyId,
        supplier_id: supplierId,
        cost_price: 5.0,
        unit_id: unitId,
        stock_current: 0,
      });


    // Crear receta
    const ingredientResponse = await request(app)
      .get('/api/v1/ingredients?search=Pollo')
      .set('Authorization', `Bearer ${token}`);


    const ingredientId = ingredientResponse.body.data[0].id;


    const recipeResponse = await request(app)
      .post('/api/v1/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Pollo Asado',
        servings: 4,
        ingredients: [
          {
            ingredient_id: ingredientId,
            quantity: 1.0, // 1kg para 4 raciones
            unit_id: unitId,
          },
        ],
      });


    const recipeId = recipeResponse.body.data.id;


    // Crear evento
    const eventResponse = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Evento Test',
        event_type: 'BANQUET',
        date_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        pax: 100,
        menus: [
          {
            recipe_id: recipeId,
          },
        ],
      });


    eventId = eventResponse.body.data.id;
  });


  describe('POST /api/v1/events/:id/generate-purchase-orders', () => {
    it('should generate PO with safety buffer applied', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${eventId}/generate-purchase-orders`)
        .set('Authorization', `Bearer ${token}`);


      expect(response.status).toBe(200);
      expect(response.body.generated_purchase_orders).toHaveLength(1);


      const po = response.body.generated_purchase_orders[0];
      expect(po.supplier_name).toBe('Proveedor Test');
      expect(po.items).toHaveLength(1);


      // Cálculo: 100 pax * 0.25kg/ración * 1.05 (safety buffer) = 26.25kg
      const item = po.items[0];
      expect(item.quantity_ordered).toBeCloseTo(26.25, 2);
      expect(item.ingredient_name).toBe('Pollo');
    });


    it('should group ingredients by supplier', async () => {
      // TODO: Crear múltiples ingredientes de distintos proveedores
      // y verificar que se crean múltiples POs
    });


    it('should include estimated delivery date', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${eventId}/generate-purchase-orders`)
        .set('Authorization', `Bearer ${token}`);


      const po = response.body.generated_purchase_orders[0];
      expect(po.estimated_delivery).toBeDefined();
      
      const deliveryDate = new Date(po.estimated_delivery);
      expect(deliveryDate).toBeInstanceOf(Date);
      expect(deliveryDate.getTime()).toBeGreaterThan(Date.now());
    });


    it('should report insufficient stock', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${eventId}/generate-purchase-orders`)
        .set('Authorization', `Bearer ${token}`);


      expect(response.body.stock_status).toBeDefined();
      expect(response.body.stock_status.has_sufficient_stock).toBe(false);
      expect(response.body.stock_status.missing_ingredients.length).toBeGreaterThan(0);
    });
  });
});
````


---


### **DÍA 5: Frontend - UI de Purchase Orders**


#### Tarea 5.1: Página de PO


`frontend/src/pages/PurchaseOrders.tsx`:
````tsx
import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';


const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};


export default function PurchaseOrders() {
  const [status, setStatus] = useState('DRAFT');
  const { data, isLoading } = usePurchaseOrders({ status });


  return (
    
      
        
          Órdenes de Compra
          
            Gestiona pedidos a proveedores
          
        


        
          
          Nueva Orden
        
      


      
        
          Borradores
          Enviadas
          Recibidas
        


        
          {isLoading ? (
            Cargando...
          ) : (
            
              
                
                  
                    Nº Orden
                    Proveedor
                    Evento
                    Fecha Pedido
                    Entrega Estimada
                    Estado
                    Total
                    Acciones
                  
                
                
                  {data?.data?.map((po) => (
                    
                      
                        
                          
                          {po.id.slice(0, 8)}
                        
                      
                      {po.supplier?.name || '-'}
                      {po.event?.name || '-'}
                      {formatDate(po.order_date)}
                      
                        {po.delivery_date_estimated
                          ? formatDate(po.delivery_date_estimated)
                          : '-'}
                      
                      
                        
                          {po.status}
                        
                      
                      
                        {formatCurrency(po.total_cost || 0)}
                      
                      
                        
                          Ver Detalles
                        
                      
                    
                  ))}
                
              
            
          )}
        
      
    
  );
}
````


---


## ✅ DEFINITION OF DONE - SPRINT 05


- [ ] CRUD de purchase orders completo (≥90% coverage)
- [ ] Generador automático desde eventos implementado
- [ ] Safety Buffer correctamente aplicado
- [ ] Agrupación por proveedor funcional
- [ ] Integración con delivery estimator
- [ ] Stock movements registrados
- [ ] Frontend con gestión de estados
- [ ] Tests E2E completos
- [ ] CI passing


---


## 📋 SPRINT 06: CSV Import & Kitchen Mode 📱


### **`
