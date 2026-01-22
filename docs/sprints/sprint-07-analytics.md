# SPRINT 07: Analytics & Reporting Dashboard 📊


**Duración:** 1 semana  
**Objetivo:** Implementar dashboard con KPIs, gráficos y reportes de Food Cost, mermas, proveedores y tendencias.


---


## 🎯 FEATURES


### Backend - Nuevas Tablas


#### Migración: Analytics Tables


`supabase/migrations/20250210000001_analytics_tables.sql`:
````sql
-- =====================================================
-- ANALYTICS: Tabla de KPIs precalculados
-- =====================================================
CREATE TABLE analytics_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Periodo
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'
  
  -- Food Cost
  total_cost DECIMAL(12,2) DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  food_cost_pct DECIMAL(5,2) DEFAULT 0,
  
  -- Mermas
  waste_cost DECIMAL(12,2) DEFAULT 0,
  waste_pct DECIMAL(5,2) DEFAULT 0,
  
  -- Compras
  purchase_orders_count INTEGER DEFAULT 0,
  purchase_orders_total DECIMAL(12,2) DEFAULT 0,
  
  -- Eventos
  events_count INTEGER DEFAULT 0,
  total_pax INTEGER DEFAULT 0,
  
  -- Stock
  low_stock_items_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, period_start, period_end, period_type)
);


CREATE INDEX idx_analytics_org_period ON analytics_kpis(organization_id, period_start, period_end);


-- =====================================================
-- ANALYTICS: Top Ingredientes por Coste
-- =====================================================
CREATE TABLE analytics_ingredient_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  
  -- Periodo
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Métricas
  quantity_used DECIMAL(12,3) DEFAULT 0,
  unit_id UUID NOT NULL REFERENCES units(id),
  total_cost DECIMAL(12,2) DEFAULT 0,
  usage_count INTEGER DEFAULT 0, -- Veces que se usó
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, ingredient_id, period_start, period_end)
);


CREATE INDEX idx_ingredient_usage_org_period ON analytics_ingredient_usage(organization_id, period_start, period_end);


-- =====================================================
-- ANALYTICS: Performance de Proveedores
-- =====================================================
CREATE TABLE analytics_supplier_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Periodo
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Métricas de entrega
  orders_count INTEGER DEFAULT 0,
  orders_on_time INTEGER DEFAULT 0,
  orders_late INTEGER DEFAULT 0,
  avg_delay_days DECIMAL(5,2) DEFAULT 0,
  
  -- Métricas de calidad
  total_items_ordered DECIMAL(12,2) DEFAULT 0,
  total_items_received DECIMAL(12,2) DEFAULT 0,
  discrepancy_pct DECIMAL(5,2) DEFAULT 0,
  
  -- Financiero
  total_spent DECIMAL(12,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, supplier_id, period_start, period_end)
);


CREATE INDEX idx_supplier_performance_org_period ON analytics_supplier_performance(organization_id, period_start, period_end);


-- =====================================================
-- FUNCIÓN: Calcular KPIs para un periodo
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_period_kpis(
  p_org_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_period_type VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_kpi_id UUID;
  v_total_cost DECIMAL;
  v_total_revenue DECIMAL;
  v_waste_cost DECIMAL;
BEGIN
  -- Calcular total de compras
  SELECT COALESCE(SUM(total_cost), 0) INTO v_total_cost
  FROM purchase_orders
  WHERE organization_id = p_org_id
    AND order_date >= p_start_date
    AND order_date <= p_end_date
    AND status IN ('SENT', 'RECEIVED');
  
  -- Calcular mermas
  SELECT COALESCE(SUM(sm.quantity * i.cost_price), 0) INTO v_waste_cost
  FROM stock_movements sm
  JOIN ingredients i ON sm.ingredient_id = i.id
  WHERE sm.organization_id = p_org_id
    AND sm.movement_type = 'WASTE'
    AND sm.created_at >= p_start_date
    AND sm.created_at <= p_end_date;
  
  -- TODO: Calcular revenue (requiere tabla de ventas)
  v_total_revenue := 0;
  
  -- Insertar o actualizar KPIs
  INSERT INTO analytics_kpis (
    organization_id,
    period_start,
    period_end,
    period_type,
    total_cost,
    total_revenue,
    food_cost_pct,
    waste_cost,
    waste_pct
  ) VALUES (
    p_org_id,
    p_start_date,
    p_end_date,
    p_period_type,
    v_total_cost,
    v_total_revenue,
    CASE WHEN v_total_revenue > 0 THEN (v_total_cost / v_total_revenue * 100) ELSE 0 END,
    v_waste_cost,
    CASE WHEN v_total_cost > 0 THEN (v_waste_cost / v_total_cost * 100) ELSE 0 END
  )
  ON CONFLICT (organization_id, period_start, period_end, period_type)
  DO UPDATE SET
    total_cost = EXCLUDED.total_cost,
    total_revenue = EXCLUDED.total_revenue,
    food_cost_pct = EXCLUDED.food_cost_pct,
    waste_cost = EXCLUDED.waste_cost,
    waste_pct = EXCLUDED.waste_pct,
    updated_at = NOW()
  RETURNING id INTO v_kpi_id;
  
  RETURN v_kpi_id;
END;
$$ LANGUAGE plpgsql;


COMMENT ON FUNCTION calculate_period_kpis IS 'Calcula y almacena KPIs para un periodo específico';
````


---


### Backend - Analytics Service


`backend/src/services/analytics.service.ts`:
````typescript
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';


export class AnalyticsService {
  /**
   * Obtener KPIs del dashboard
   */
  async getDashboardKPIs(
    organizationId: string,
    period: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_WEEK' | 'CUSTOM',
    customStart?: Date,
    customEnd?: Date
  ): Promise {
    let startDate: Date;
    let endDate: Date;


    switch (period) {
      case 'THIS_MONTH':
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
      case 'LAST_MONTH':
        const lastMonth = subMonths(new Date(), 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'THIS_WEEK':
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        break;
      case 'CUSTOM':
        if (!customStart || !customEnd) {
          throw new Error('Custom dates required');
        }
        startDate = customStart;
        endDate = customEnd;
        break;
    }


    // Calcular KPIs
    await supabase.rpc('calculate_period_kpis', {
      p_org_id: organizationId,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
      p_period_type: period,
    });


    // Obtener KPIs calculados
    const { data: kpis } = await supabase
      .from('analytics_kpis')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('period_start', startDate.toISOString().split('T')[0])
      .lte('period_end', endDate.toISOString().split('T')[0])
      .single();


    return kpis;
  }


  /**
   * Top ingredientes por coste
   */
  async getTopIngredientsByCost(
    organizationId: string,
    limit: number = 10
  ): Promise {
    const { data } = await supabase
      .from('analytics_ingredient_usage')
      .select(`
        *,
        ingredient:ingredients (
          id,
          name
        ),
        unit:units (
          abbreviation
        )
      `)
      .eq('organization_id', organizationId)
      .order('total_cost', { ascending: false })
      .limit(limit);


    return data || [];
  }


  /**
   * Tendencia de Food Cost (últimos 6 meses)
   */
  async getFoodCostTrend(organizationId: string): Promise {
    const { data } = await supabase
      .from('analytics_kpis')
      .select('period_start, food_cost_pct, total_cost, total_revenue')
      .eq('organization_id', organizationId)
      .eq('period_type', 'MONTHLY')
      .order('period_start', { ascending: true })
      .limit(6);


    return data || [];
  }


  /**
   * Performance de proveedores
   */
  async getSupplierPerformance(organizationId: string): Promise {
    const { data } = await supabase
      .from('analytics_supplier_performance')
      .select(`
        *,
        supplier:suppliers (
          id,
          name
        )
      `)
      .eq('organization_id', organizationId)
      .order('total_spent', { ascending: false })
      .limit(10);


    return data || [];
  }


  /**
   * Gráfico de mermas por causa
   */
  async getWasteByCause(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise {
    const { data } = await supabase
      .from('stock_movements')
      .select(`
        notes,
        quantity,
        ingredient:ingredients (
          cost_price
        )
      `)
      .eq('organization_id', organizationId)
      .eq('movement_type', 'WASTE')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());


    // Agrupar por causa (extraer de notes)
    const byCause = new Map();


    data?.forEach((movement) => {
      const cause = movement.notes || 'Sin especificar';
      const cost = movement.quantity * (movement.ingredient?.cost_price || 0);
      byCause.set(cause, (byCause.get(cause) || 0) + cost);
    });


    return Array.from(byCause.entries()).map(([cause, cost]) => ({
      cause,
      cost,
    }));
  }
}
````


---


### Backend - Controller


`backend/src/controllers/analytics.controller.ts`:
````typescript
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { AnalyticsService } from '@/services/analytics.service';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';


export class AnalyticsController {
  async getDashboardKPIs(req: AuthRequest, res: Response): Promise {
    try {
      const organizationId = req.user!.organizationIds[0];
      const { period = 'THIS_MONTH', start_date, end_date } = req.query;


      const service = new AnalyticsService();
      const kpis = await service.getDashboardKPIs(
        organizationId,
        period as any,
        start_date ? new Date(start_date as string) : undefined,
        end_date ? new Date(end_date as string) : undefined
      );


      res.json({ data: kpis });
    } catch (error) {
      logger.error('Error getting dashboard KPIs:', error);
      res.status(500).json({ error: 'Failed to get KPIs' });
    }
  }


  async getTopIngredients(req: AuthRequest, res: Response): Promise {
    try {
      const organizationId = req.user!.organizationIds[0];
      const { limit = 10 } = req.query;


      const service = new AnalyticsService();
      const data = await service.getTopIngredientsByCost(
        organizationId,
        Number(limit)
      );


      res.json({ data });
    } catch (error) {
      logger.error('Error getting top ingredients:', error);
      res.status(500).json({ error: 'Failed to get top ingredients' });
    }
  }


  async getFoodCostTrend(req: AuthRequest, res: Response): Promise {
    try {
      const organizationId = req.user!.organizationIds[0];


      const service = new AnalyticsService();
      const data = await service.getFoodCostTrend(organizationId);


      res.json({ data });
    } catch (error) {
      logger.error('Error getting food cost trend:', error);
      res.status(500).json({ error: 'Failed to get trend' });
    }
  }


  async getSupplierPerformance(req: AuthRequest, res: Response): Promise {
    try {
      const organizationId = req.user!.organizationIds[0];


      const service = new AnalyticsService();
      const data = await service.getSupplierPerformance(organizationId);


      res.json({ data });
    } catch (error) {
      logger.error('Error getting supplier performance:', error);
      res.status(500).json({ error: 'Failed to get performance' });
    }
  }


  async getWasteAnalysis(req: AuthRequest, res: Response): Promise {
    try {
      const organizationId = req.user!.organizationIds[0];
      const { start_date, end_date } = req.query;


      if (!start_date || !end_date) {
        throw new AppError(400, 'start_date and end_date required');
      }


      const service = new AnalyticsService();
      const data = await service.getWasteByCause(
        organizationId,
        new Date(start_date as string),
        new Date(end_date as string)
      );


      res.json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error getting waste analysis:', error);
      res.status(500).json({ error: 'Failed to get waste analysis' });
    }
  }
}
````


---


### Frontend - Dashboard con Gráficos


`frontend/src/pages/Dashboard.tsx` (ACTUALIZAR):
````tsx
import { SupplierCountdown } from '@/components/dashboard/SupplierCountdown';
import { KPICards } from '@/components/dashboard/KPICards';
import { FoodCostChart } from '@/components/dashboard/FoodCostChart';
import { TopIngredientsChart } from '@/components/dashboard/TopIngredientsChart';
import { WasteAnalysisChart } from '@/components/dashboard/WasteAnalysisChart';
import { SupplierPerformanceTable } from '@/components/dashboard/SupplierPerformanceTable';


export default function Dashboard() {
  return (
    
      
        Dashboard
        
          Resumen de operaciones y KPIs
        
      


      {/* KPI Cards */}
      


      {/* Countdown Widget */}
      
        ⏰ Proveedores con hora de corte
        
      


      {/* Charts Grid */}
      
        
        
        
        
      
    
  );
}
````


---


### Frontend - KPI Cards Component


`frontend/src/components/dashboard/KPICards.tsx`:
````tsx
import { TrendingUp, TrendingDown, ShoppingCart, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardKPIs } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/lib/utils';


export function KPICards() {
  const { data: kpis, isLoading } = useDashboardKPIs('THIS_MONTH');


  if (isLoading) {
    return Cargando KPIs...;
  }


  const cards = [
    {
      title: 'Food Cost',
      value: `${kpis?.food_cost_pct?.toFixed(1)}%`,
      subtitle: formatCurrency(kpis?.total_cost || 0),
      icon: TrendingUp,
      trend: kpis?.food_cost_pct < 30 ? 'positive' : 'negative',
    },
    {
      title: 'Mermas',
      value: `${kpis?.waste_pct?.toFixed(1)}%`,
      subtitle: formatCurrency(kpis?.waste_cost || 0),
      icon: AlertTriangle,
      trend: kpis?.waste_pct < 5 ? 'positive' : 'negative',
    },
    {
      title: 'Órdenes de Compra',
      value: kpis?.purchase_orders_count || 0,
      subtitle: formatCurrency(kpis?.purchase_orders_total || 0),
      icon: ShoppingCart,
      trend: 'neutral',
    },
    {
      title: 'Stock Bajo',
      value: kpis?.low_stock_items_count || 0,
      subtitle: 'Ingredientes bajo mínimo',
      icon: TrendingDown,
      trend: kpis?.low_stock_items_count > 0 ? 'negative' : 'positive',
    },
  ];


  return (
    
      {cards.map((card) => (
        
          
            
              {card.title}
            
            
          
          
            {card.value}
            {card.subtitle}
          
        
      ))}
    
  );
}
````


---


### Frontend - Food Cost Chart


`frontend/src/components/dashboard/FoodCostChart.tsx`:
````tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFoodCostTrend } from '@/hooks/useAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


export function FoodCostChart() {
  const { data, isLoading } = useFoodCostTrend();


  if (isLoading) {
    return Cargando...;
  }


  const chartData = data?.map((item) => ({
    month: format(new Date(item.period_start), 'MMM', { locale: es }),
    foodCost: item.food_cost_pct,
    cost: item.total_cost,
  })) || [];


  return (
    
      
        Evolución Food Cost (últimos 6 meses)
      
      
        
          
            
            
            
            
            
            
          
        
      
    
  );
}
````


---


## 🔔 SPRINT 08: Sistema de Notificaciones


### **`
