# SPRINT 12: Gestión de Mermas y Causas 📉


**Objetivo:** Implementar sistema completo de registro de mermas con categorización por causas y análisis.


---


### Migración: Waste Tracking


`supabase/migrations/20250301000001_waste_management.sql`:
```sql
-- =====================================================
-- WASTE CAUSES: Catálogo de causas de merma
-- =====================================================
CREATE TABLE waste_causes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  category VARCHAR(50) NOT NULL, -- 'CADUCIDAD', 'QUEMADO', 'FALLO_PRODUCCION', 'RECHAZO_CLIENTE', 'DETERIORO', 'OTRO'
  
  -- Opciones de prevención
  preventable BOOLEAN DEFAULT TRUE,
  prevention_notes TEXT NULL,
  
  -- Metadata
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, name)
);


CREATE INDEX idx_waste_causes_org ON waste_causes(organization_id);
CREATE INDEX idx_waste_causes_category ON waste_causes(category);


-- Seed de causas por defecto
INSERT INTO waste_causes (organization_id, name, category, preventable, prevention_notes)
SELECT 
  o.id,
  cause.name,
  cause.category,
  cause.preventable,
  cause.prevention
FROM organizations o
CROSS JOIN (
  VALUES 
    ('Caducidad', 'CADUCIDAD', true, 'Mejorar rotación FIFO y control de fechas'),
    ('Quemado/Pasado', 'QUEMADO', true, 'Control de tiempos y temperaturas de cocción'),
    ('Sobreproducción', 'FALLO_PRODUCCION', true, 'Ajustar forecasting y planificación'),
    ('Porción incorrecta', 'FALLO_PRODUCCION', true, 'Capacitación en escandallos'),
    ('Rechazo cliente', 'RECHAZO_CLIENTE', false, 'Comunicación de alergias/preferencias'),
    ('Deterioro almacenamiento', 'DETERIORO', true, 'Revisar condiciones de conservación'),
    ('Contaminación cruzada', 'DETERIORO', true, 'Protocolos de higiene y separación'),
    ('Pruebas/Degustación', 'OTRO', false, 'Coste necesario para control de calidad')
) AS cause(name, category, preventable, prevention)
ON CONFLICT DO NOTHING;


-- =====================================================
-- WASTE RECORDS: Actualizar tabla de movimientos
-- =====================================================
ALTER TABLE stock_movements 
  ADD COLUMN waste_cause_id UUID REFERENCES waste_causes(id),
  ADD COLUMN waste_preventable BOOLEAN NULL,
  ADD COLUMN waste_cost DECIMAL(10,2) NULL;


CREATE INDEX idx_stock_movements_waste_cause ON stock_movements(waste_cause_id) 
  WHERE movement_type = 'WASTE';


-- =====================================================
-- VIEWS: Vista consolidada de mermas
-- =====================================================
CREATE OR REPLACE VIEW v_waste_analysis AS
SELECT 
  sm.organization_id,
  sm.created_at::DATE as waste_date,
  DATE_TRUNC('week', sm.created_at) as waste_week,
  DATE_TRUNC('month', sm.created_at) as waste_month,
  wc.name as cause_name,
  wc.category as cause_category,
  wc.preventable,
  i.name as ingredient_name,
  pf.name as family_name,
  sm.quantity,
  u.abbreviation as unit,
  i.cost_price,
  (sm.quantity * i.cost_price) as waste_cost,
  sm.notes
FROM stock_movements sm
JOIN ingredients i ON sm.ingredient_id = i.id
LEFT JOIN product_families pf ON i.family_id = pf.id
JOIN units u ON sm.unit_id = u.id
LEFT JOIN waste_causes wc ON sm.waste_cause_id = wc.id
WHERE sm.movement_type = 'WASTE';


COMMENT ON VIEW v_waste_analysis IS 'Vista consolidada para análisis de mermas';


-- =====================================================
-- FUNCIÓN: Calcular mermas por periodo
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_waste_by_period(
  p_org_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  cause_category VARCHAR,
  cause_name VARCHAR,
  total_waste_cost DECIMAL,
  item_count BIGINT,
  preventable_pct DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.cause_category,
    v.cause_name,
    SUM(v.waste_cost)::DECIMAL as total_waste_cost,
    COUNT(*)::BIGINT as item_count,
    (COUNT(*) FILTER (WHERE v.preventable = true)::DECIMAL / COUNT(*) * 100) as preventable_pct
  FROM v_waste_analysis v
  WHERE v.organization_id = p_org_id
    AND v.waste_date >= p_start_date
    AND v.waste_date <= p_end_date
  GROUP BY v.cause_category, v.cause_name
  ORDER BY total_waste_cost DESC;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- FUNCIÓN: Top ingredientes con más mermas
-- =====================================================
CREATE OR REPLACE FUNCTION get_top_wasted_ingredients(
  p_org_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  ingredient_name VARCHAR,
  family_name VARCHAR,
  total_quantity DECIMAL,
  unit VARCHAR,
  total_cost DECIMAL,
  waste_events BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.ingredient_name,
    v.family_name,
    SUM(v.quantity)::DECIMAL as total_quantity,
    v.unit,
    SUM(v.waste_cost)::DECIMAL as total_cost,
    COUNT(*)::BIGINT as waste_events
  FROM v_waste_analysis v
  WHERE v.organization_id = p_org_id
    AND v.waste_date >= p_start_date
    AND v.waste_date <= p_end_date
  GROUP BY v.ingredient_name, v.family_name, v.unit
  ORDER BY total_cost DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```


---


### Backend - Waste Service


`backend/src/services/waste-management.service.ts`:
```typescript
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';


export class WasteManagementService {
  /**
   * Registrar merma con causa
   */
  async recordWaste(params: {
    organizationId: string;
    ingredientId: string;
    quantity: number;
    unitId: string;
    wasteCauseId: string;
    notes?: string;
    userId?: string;
  }): Promise {
    try {
      // 1. Obtener precio del ingrediente
      const { data: ingredient } = await supabase
        .from('ingredients')
        .select('cost_price, name')
        .eq('id', params.ingredientId)
        .single();


      if (!ingredient) {
        throw new Error('Ingredient not found');
      }


      const wasteCost = params.quantity * ingredient.cost_price;


      // 2. Verificar si la causa es prevenible
      const { data: cause } = await supabase
        .from('waste_causes')
        .select('preventable')
        .eq('id', params.wasteCauseId)
        .single();


      // 3. Registrar movimiento de stock
      const { error } = await supabase.from('stock_movements').insert({
        organization_id: params.organizationId,
        ingredient_id: params.ingredientId,
        movement_type: 'WASTE',
        quantity: params.quantity,
        unit_id: params.unitId,
        waste_cause_id: params.wasteCauseId,
        waste_preventable: cause?.preventable || false,
        waste_cost: wasteCost,
        notes: params.notes,
        user_id: params.userId,
      });


      if (error) throw error;


      // 4. Actualizar stock del ingrediente
      await supabase.rpc('decrement_ingredient_stock', {
        p_ingredient_id: params.ingredientId,
        p_quantity: params.quantity,
      });


      logger.info(`Waste recorded: ${ingredient.name} - ${params.quantity} units - €${wasteCost.toFixed(2)}`);
    } catch (error) {
      logger.error('Error recording waste:', error);
      throw error;
    }
  }


  /**
   * Obtener análisis de mermas por periodo
   */
  async getWasteAnalysis(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise {
    const { data, error } = await supabase.rpc('calculate_waste_by_period', {
      p_org_id: organizationId,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
    });


    if (error) throw error;


    return data;
  }


  /**
   * Top ingredientes con más mermas
   */
  async getTopWastedIngredients(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise {
    const { data, error } = await supabase.rpc('get_top_wasted_ingredients', {
      p_org_id: organizationId,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
      p_limit: limit,
    });


    if (error) throw error;


    return data;
  }


  /**
   * Obtener tendencia de mermas (semanal/mensual)
   */
  async getWasteTrend(
    organizationId: string,
    period: 'WEEKLY' | 'MONTHLY',
    limit: number = 12
  ): Promise {
    const groupBy = period === 'WEEKLY' ? 'waste_week' : 'waste_month';


    const { data } = await supabase
      .from('v_waste_analysis')
      .select(`${groupBy}, waste_cost`)
      .eq('organization_id', organizationId)
      .order(groupBy, { ascending: false })
      .limit(limit * 10); // Aproximado


    // Agrupar manualmente
    const grouped = new Map();


    data?.forEach((row: any) => {
      const key = row[groupBy];
      grouped.set(key, (grouped.get(key) || 0) + row.waste_cost);
    });


    return Array.from(grouped.entries())
      .map(([period, cost]) => ({ period, cost }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-limit);
  }


  /**
   * Calcular % de mermas prevenibles
   */
  async getPreventableWastePercentage(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise {
    const { data } = await supabase
      .from('v_waste_analysis')
      .select('waste_cost, preventable')
      .eq('organization_id', organizationId)
      .gte('waste_date', startDate.toISOString().split('T')[0])
      .lte('waste_date', endDate.toISOString().split('T')[0]);


    if (!data || data.length === 0) return 0;


    const total = data.reduce((sum, row) => sum + row.waste_cost, 0);
    const preventable = data
      .filter((row) => row.preventable)
      .reduce((sum, row) => sum + row.waste_cost, 0);


    return total > 0 ? (preventable / total) * 100 : 0;
  }
}
```


---


### Frontend - Waste Recording Form


`frontend/src/components/waste/RecordWasteForm.tsx`:
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIngredients } from '@/hooks/useIngredients';
import { useWasteCauses } from '@/hooks/useWasteCauses';
import { useRecordWaste } from '@/hooks/useWaste';


const formSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  waste_cause_id: z.string().uuid(),
  notes: z.string().optional(),
});


type FormData = z.infer;


export function RecordWasteForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: ingredients } = useIngredients();
  const { data: causes } = useWasteCauses();
  const recordMutation = useRecordWaste();


  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
  });


  const selectedIngredientId = watch('ingredient_id');
  const selectedIngredient = ingredients?.data?.find(
    (i) => i.id === selectedIngredientId
  );


  const onSubmit = async (data: FormData) => {
    await recordMutation.mutateAsync({
      ...data,
      unit_id: selectedIngredient?.unit_id || '',
    });
    onSuccess?.();
  };


  return (
    
      
        Ingrediente *
        <Select
          value={selectedIngredientId}
          onValueChange={(value) => setValue('ingredient_id', value)}
        >
          
            
          
          
            {ingredients?.data?.map((ingredient) => (
              
                {ingredient.name} ({ingredient.stock_current}{' '}
                {ingredient.units.abbreviation})
              
            ))}
          
        
        {errors.ingredient_id && (
          {errors.ingredient_id.message}
        )}
      


      
        Cantidad *
        
          
          {selectedIngredient && (
            
              {selectedIngredient.units.abbreviation}
            
          )}
        
        {errors.quantity && (
          {errors.quantity.message}
        )}
      


      
        Causa de la merma *
        <Select onValueChange={(value) => setValue('waste_cause_id', value)}>
          
            
          
          
            {causes?.data?.map((cause) => (
              
                {cause.name}
                {cause.preventable && ' 🟡'}
              
            ))}
          
        
        
          🟡 = Causa prevenible
        
        {errors.waste_cause_id && (
          {errors.waste_cause_id.message}
        )}
      


      
        Notas adicionales
        
      


      {selectedIngredient && watch('quantity') && (
        
          
            Coste estimado de la merma:
          
          
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(Number(watch('quantity')) * selectedIngredient.cost_price)}
          
        
      )}


      
        {recordMutation.isPending ? 'Registrando...' : 'Registrar Merma'}
      
    
  );
}
```


---


Continuaré con **Features 8 y 9 (Webhooks y Permisos Granulares)** en el siguiente mensaje. ¿Sigo?continua8:48🚀 MVP 2.0 - FEATURES 8 Y 9 FINALES


🔗 SPRINT 13: API Webhooks para Integraciones
