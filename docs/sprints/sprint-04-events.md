# SPRINT 04: Eventos & Motor de Cálculo de Demanda 📅


**Duración:** 1 semana (5 días hábiles)  
**Objetivo:** Implementar sistema completo de eventos con cálculo de demanda diferenciado por tipo (BANQUET vs A_LA_CARTE vs SPORTS_MULTI).


---


## 📊 MÉTRICAS DE ÉXITO


- ✅ Cobertura de tests ≥ 90%
- ✅ CRUD de eventos funcional
- ✅ Sistema de recetas maestras implementado
- ✅ Motor de cálculo de demanda con lógica diferenciada
- ✅ Ingredientes directos para SPORTS_MULTI
- ✅ Frontend con calendario de eventos


---


## 🎯 TAREAS DETALLADAS


### **DÍA 1: Backend - Recetas Maestras**


#### Tarea 1.1: Controller de recetas


`backend/src/controllers/recipes.controller.ts`:
```typescript
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';


export class RecipesController {
  async getAll(req: AuthRequest, res: Response): Promise {
    try {
      const orgIds = req.user!.organizationIds;
      const { search = '', page = 1, limit = 50 } = req.query;


      let query = supabase
        .from('recipes')
        .select(`
          id,
          name,
          description,
          servings,
          total_cost,
          cost_per_serving,
          created_at,
          updated_at
        `, { count: 'exact' })
        .in('organization_id', orgIds)
        .is('deleted_at', null);


      if (search) {
        query = query.ilike('name', `%${search}%`);
      }


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
      logger.error('Error fetching recipes:', error);
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  }


  async getById(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // Obtener receta con ingredientes
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .single();


      if (recipeError || !recipe) {
        throw new AppError(404, 'Recipe not found');
      }


      // Obtener ingredientes de la receta
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select(`
          id,
          quantity,
          ingredient:ingredients (
            id,
            name,
            cost_price,
            unit:units!ingredients_unit_id_fkey (
              id,
              name,
              abbreviation
            )
          ),
          unit:units (
            id,
            name,
            abbreviation
          )
        `)
        .eq('recipe_id', id);


      if (ingredientsError) throw ingredientsError;


      res.json({
        data: {
          ...recipe,
          ingredients: ingredients || [],
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error fetching recipe:', error);
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  }


  async create(req: AuthRequest, res: Response): Promise {
    try {
      const { name, description, servings, ingredients } = req.body;
      const organizationId = req.user!.organizationIds[0];


      // 1. Crear receta
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          organization_id: organizationId,
          name,
          description,
          servings,
        })
        .select()
        .single();


      if (recipeError) {
        if (recipeError.code === '23505') {
          throw new AppError(409, 'Recipe with this name already exists');
        }
        throw recipeError;
      }


      // 2. Añadir ingredientes
      if (ingredients && ingredients.length > 0) {
        const recipeIngredients = ingredients.map((ing: any) => ({
          recipe_id: recipe.id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit_id: ing.unit_id,
        }));


        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(recipeIngredients);


        if (ingredientsError) {
          // Rollback: eliminar receta
          await supabase.from('recipes').delete().eq('id', recipe.id);
          throw ingredientsError;
        }
      }


      // 3. Calcular costes
      await this.recalculateCosts(recipe.id);


      // 4. Devolver receta completa
      const response = await this.getRecipeComplete(recipe.id);
      res.status(201).json({ data: response });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error creating recipe:', error);
      res.status(500).json({ error: 'Failed to create recipe' });
    }
  }


  async update(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const { name, description, servings, ingredients } = req.body;
      const orgIds = req.user!.organizationIds;


      // Verificar ownership
      const { data: existing } = await supabase
        .from('recipes')
        .select('id')
        .eq('id', id)
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .single();


      if (!existing) {
        throw new AppError(404, 'Recipe not found');
      }


      // 1. Actualizar receta base
      if (name || description || servings) {
        const { error } = await supabase
          .from('recipes')
          .update({ name, description, servings })
          .eq('id', id);


        if (error) throw error;
      }


      // 2. Si hay ingredientes, reemplazar todos
      if (ingredients) {
        // Eliminar ingredientes existentes
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);


        // Insertar nuevos
        if (ingredients.length > 0) {
          const recipeIngredients = ingredients.map((ing: any) => ({
            recipe_id: id,
            ingredient_id: ing.ingredient_id,
            quantity: ing.quantity,
            unit_id: ing.unit_id,
          }));


          const { error: insertError } = await supabase
            .from('recipe_ingredients')
            .insert(recipeIngredients);


          if (insertError) throw insertError;
        }


        // Recalcular costes
        await this.recalculateCosts(id);
      }


      const response = await this.getRecipeComplete(id);
      res.json({ data: response });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error updating recipe:', error);
      res.status(500).json({ error: 'Failed to update recipe' });
    }
  }


  async delete(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // Verificar si está en uso
      const { count } = await supabase
        .from('event_menus')
        .select('id', { count: 'exact', head: true })
        .eq('recipe_id', id);


      if (count && count > 0) {
        throw new AppError(
          400,
          `Cannot delete recipe used in ${count} events`
        );
      }


      // Soft delete
      const { error } = await supabase
        .from('recipes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .in('organization_id', orgIds);


      if (error) throw error;


      res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error deleting recipe:', error);
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  }


  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================


  private async recalculateCosts(recipeId: string): Promise {
    // Obtener ingredientes con precios
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select(`
        quantity,
        ingredient:ingredients (
          cost_price
        )
      `)
      .eq('recipe_id', recipeId);


    if (!ingredients || ingredients.length === 0) {
      await supabase
        .from('recipes')
        .update({ total_cost: 0, cost_per_serving: 0 })
        .eq('id', recipeId);
      return;
    }


    // Calcular coste total
    const totalCost = ingredients.reduce((sum, item) => {
      const ingredientCost = item.ingredient?.cost_price || 0;
      return sum + item.quantity * ingredientCost;
    }, 0);


    // Obtener servings
    const { data: recipe } = await supabase
      .from('recipes')
      .select('servings')
      .eq('id', recipeId)
      .single();


    const servings = recipe?.servings || 1;
    const costPerServing = totalCost / servings;


    // Actualizar
    await supabase
      .from('recipes')
      .update({
        total_cost: totalCost,
        cost_per_serving: costPerServing,
      })
      .eq('id', recipeId);
  }


  private async getRecipeComplete(recipeId: string): Promise {
    const { data: recipe } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();


    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        quantity,
        ingredient:ingredients (
          id,
          name,
          cost_price,
          unit:units!ingredients_unit_id_fkey (
            id,
            name,
            abbreviation
          )
        ),
        unit:units (
          id,
          name,
          abbreviation
        )
      `)
      .eq('recipe_id', recipeId);


    return {
      ...recipe,
      ingredients: ingredients || [],
    };
  }
}
```


#### Tarea 1.2: Routes


`backend/src/routes/recipes.routes.ts`:
```typescript
import { Router } from 'express';
import { RecipesController } from '@/controllers/recipes.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { createRecipeSchema, updateRecipeSchema } from '@/utils/validators';


const router = Router();
const controller = new RecipesController();


router.use(authMiddleware);


router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', validate(createRecipeSchema), controller.create);
router.patch('/:id', validate(updateRecipeSchema), controller.update);
router.delete('/:id', controller.delete);


export default router;
```


#### Tarea 1.3: Validators


`backend/src/utils/validators.ts` (añadir):
```typescript
export const createRecipeSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name required'),
    description: z.string().optional(),
    servings: z.number().int().min(1),
    ingredients: z
      .array(
        z.object({
          ingredient_id: z.string().uuid(),
          quantity: z.number().positive(),
          unit_id: z.string().uuid(),
        })
      )
      .optional(),
  }),
});


export const updateRecipeSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    servings: z.number().int().min(1).optional(),
    ingredients: z
      .array(
        z.object({
          ingredient_id: z.string().uuid(),
          quantity: z.number().positive(),
          unit_id: z.string().uuid(),
        })
      )
      .optional(),
  }),
});
```


---


### **DÍA 2: Backend - CRUD de Eventos**


#### Tarea 2.1: Controller de eventos


`backend/src/controllers/events.controller.ts`:
```typescript
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';


export class EventsController {
  async getAll(req: AuthRequest, res: Response): Promise {
    try {
      const orgIds = req.user!.organizationIds;
      const { 
        start_date, 
        end_date, 
        event_type, 
        status 
      } = req.query;


      let query = supabase
        .from('events')
        .select('*', { count: 'exact' })
        .in('organization_id', orgIds)
        .is('deleted_at', null);


      // Filtros
      if (start_date) {
        query = query.gte('date_start', start_date);
      }
      if (end_date) {
        query = query.lte('date_start', end_date);
      }
      if (event_type) {
        query = query.eq('event_type', event_type);
      }
      if (status) {
        query = query.eq('status', status);
      }


      const { data, error, count } = await query.order('date_start', { ascending: true });


      if (error) throw error;


      res.json({ data, total: count || 0 });
    } catch (error) {
      logger.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }


  async getById(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // Evento base
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .single();


      if (eventError || !event) {
        throw new AppError(404, 'Event not found');
      }


      // Menús (recetas)
      const { data: menus } = await supabase
        .from('event_menus')
        .select(`
          id,
          qty_forecast,
          recipe:recipes (
            id,
            name,
            cost_per_serving
          )
        `)
        .eq('event_id', id);


      // Ingredientes directos (para SPORTS_MULTI)
      const { data: directIngredients } = await supabase
        .from('event_direct_ingredients')
        .select(`
          id,
          quantity,
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
        .eq('event_id', id);


      res.json({
        data: {
          ...event,
          menus: menus || [],
          direct_ingredients: directIngredients || [],
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error fetching event:', error);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  }


  async create(req: AuthRequest, res: Response): Promise {
    try {
      const {
        name,
        event_type,
        date_start,
        date_end,
        pax,
        menus,
        direct_ingredients,
      } = req.body;


      const organizationId = req.user!.organizationIds[0];


      // 1. Crear evento
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          organization_id: organizationId,
          name,
          event_type,
          date_start,
          date_end,
          pax,
          status: 'DRAFT',
        })
        .select()
        .single();


      if (eventError) throw eventError;


      // 2. Añadir menús (si hay)
      if (menus && menus.length > 0) {
        const eventMenus = menus.map((menu: any) => ({
          event_id: event.id,
          recipe_id: menu.recipe_id,
          qty_forecast: menu.qty_forecast || 0,
        }));


        const { error: menusError } = await supabase
          .from('event_menus')
          .insert(eventMenus);


        if (menusError) {
          await supabase.from('events').delete().eq('id', event.id);
          throw menusError;
        }
      }


      // 3. Añadir ingredientes directos (para SPORTS_MULTI)
      if (direct_ingredients && direct_ingredients.length > 0) {
        const directIngs = direct_ingredients.map((ing: any) => ({
          event_id: event.id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit_id: ing.unit_id,
        }));


        const { error: directError } = await supabase
          .from('event_direct_ingredients')
          .insert(directIngs);


        if (directError) {
          await supabase.from('events').delete().eq('id', event.id);
          throw directError;
        }
      }


      res.status(201).json({ data: event });
    } catch (error) {
      logger.error('Error creating event:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }


  async update(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;
      const updateData = req.body;


      // Verificar ownership
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('id', id)
        .in('organization_id', orgIds)
        .is('deleted_at', null)
        .single();


      if (!existing) {
        throw new AppError(404, 'Event not found');
      }


      const { data, error } = await supabase
        .from('events')
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
      logger.error('Error updating event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }


  async delete(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // Soft delete
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .in('organization_id', orgIds);


      if (error) throw error;


      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      logger.error('Error deleting event:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }
}
```


---


### **DÍA 3: Motor de Cálculo de Demanda**


#### Tarea 3.1: Service de cálculo de demanda


`backend/src/services/demand-calculator.service.ts`:
```typescript
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';


interface IngredientDemand {
  ingredient_id: string;
  ingredient_name: string;
  quantity_needed: number;
  unit_id: string;
  unit_abbr: string;
  source: 'RECIPE' | 'DIRECT';
  safety_buffer: number;
  quantity_with_buffer: number;
}


export class DemandCalculatorService {
  /**
   * Calcula demanda de ingredientes para un evento
   * 
   * LÓGICA:
   * - BANQUET: Pax * Cantidad_Receta (exactitud total)
   * - A_LA_CARTE: qty_forecast manual por plato
   * - SPORTS_MULTI: ingredientes directos + recetas
   */
  async calculateEventDemand(eventId: string): Promise {
    try {
      // 1. Obtener evento
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();


      if (eventError || !event) {
        throw new Error('Event not found');
      }


      logger.info(`Calculating demand for event ${event.name} (${event.event_type})`);


      const demands: Map = new Map();


      // 2. Calcular según tipo de evento
      if (event.event_type === 'BANQUET') {
        await this.calculateBanquetDemand(event, demands);
      } else if (event.event_type === 'A_LA_CARTE') {
        await this.calculateALaCarteDemand(event, demands);
      } else if (event.event_type === 'SPORTS_MULTI') {
        await this.calculateSportsMultiDemand(event, demands);
      } else {
        // Otros tipos: usar lógica de banquet por defecto
        await this.calculateBanquetDemand(event, demands);
      }


      // 3. Aplicar safety buffer por familia
      await this.applySafetyBuffers(demands);


      return Array.from(demands.values());
    } catch (error) {
      logger.error('Error calculating demand:', error);
      throw error;
    }
  }


  /**
   * BANQUET: Pax * Cantidad por ración
   */
  private async calculateBanquetDemand(
    event: any,
    demands: Map
  ): Promise {
    // Obtener menús del evento
    const { data: menus } = await supabase
      .from('event_menus')
      .select(`
        recipe:recipes (
          id,
          servings,
          recipe_ingredients (
            quantity,
            ingredient:ingredients (
              id,
              name,
              family_id,
              unit:units!ingredients_unit_id_fkey (
                id,
                abbreviation
              )
            ),
            unit:units (
              id,
              abbreviation
            )
          )
        )
      `)
      .eq('event_id', event.id);


    if (!menus || menus.length === 0) return;


    for (const menu of menus) {
      const recipe = menu.recipe;
      const servings = recipe.servings || 1;


      for (const recipeIng of recipe.recipe_ingredients) {
        const ingredient = recipeIng.ingredient;
        
        // Cantidad por ración
        const qtyPerServing = recipeIng.quantity / servings;
        
        // Cantidad total = pax * cantidad por ración
        const totalQty = event.pax * qtyPerServing;


        this.addDemand(demands, {
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          quantity_needed: totalQty,
          unit_id: recipeIng.unit.id,
          unit_abbr: recipeIng.unit.abbreviation,
          source: 'RECIPE',
        });
      }
    }
  }


  /**
   * A_LA_CARTE: qty_forecast manual
   */
  private async calculateALaCarteDemand(
    event: any,
    demands: Map
  ): Promise {
    const { data: menus } = await supabase
      .from('event_menus')
      .select(`
        qty_forecast,
        recipe:recipes (
          id,
          servings,
          recipe_ingredients (
            quantity,
            ingredient:ingredients (
              id,
              name,
              family_id,
              unit:units!ingredients_unit_id_fkey (
                id,
                abbreviation
              )
            ),
            unit:units (
              id,
              abbreviation
            )
          )
        )
      `)
      .eq('event_id', event.id);


    if (!menus || menus.length === 0) return;


    for (const menu of menus) {
      const recipe = menu.recipe;
      const servings = recipe.servings || 1;
      const forecast = menu.qty_forecast || 0;


      for (const recipeIng of recipe.recipe_ingredients) {
        const ingredient = recipeIng.ingredient;
        
        const qtyPerServing = recipeIng.quantity / servings;
        const totalQty = forecast * qtyPerServing;


        this.addDemand(demands, {
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          quantity_needed: totalQty,
          unit_id: recipeIng.unit.id,
          unit_abbr: recipeIng.unit.abbreviation,
          source: 'RECIPE',
        });
      }
    }
  }


  /**
   * SPORTS_MULTI: Ingredientes directos + recetas
   */
  private async calculateSportsMultiDemand(
    event: any,
    demands: Map
  ): Promise {
    // 1. Ingredientes directos
    const { data: directIngredients } = await supabase
      .from('event_direct_ingredients')
      .select(`
        quantity,
        ingredient:ingredients (
          id,
          name,
          family_id,
          unit:units!ingredients_unit_id_fkey (
            id,
            abbreviation
          )
        ),
        unit:units (
          id,
          abbreviation
        )
      `)
      .eq('event_id', event.id);


    if (directIngredients) {
      for (const item of directIngredients) {
        this.addDemand(demands, {
          ingredient_id: item.ingredient.id,
          ingredient_name: item.ingredient.name,
          quantity_needed: item.quantity,
          unit_id: item.unit.id,
          unit_abbr: item.unit.abbreviation,
          source: 'DIRECT',
        });
      }
    }


    // 2. También puede tener recetas (usar lógica banquet)
    await this.calculateBanquetDemand(event, demands);
  }


  /**
   * Aplicar safety buffer según familia
   */
  private async applySafetyBuffers(
    demands: Map
  ): Promise {
    for (const [key, demand] of demands) {
      // Obtener familia del ingrediente
      const { data: ingredient } = await supabase
        .from('ingredients')
        .select(`
          family:product_families (
            safety_buffer_pct
          )
        `)
        .eq('id', demand.ingredient_id)
        .single();


      const buffer = ingredient?.family?.safety_buffer_pct || 1.10;


      demand.safety_buffer = buffer;
      demand.quantity_with_buffer = demand.quantity_needed * buffer;


      demands.set(key, demand);
    }
  }


  /**
   * Helper: añadir/acumular demanda
   */
  private addDemand(
    demands: Map,
    newDemand: Omit
  ): void {
    const key = `${newDemand.ingredient_id}_${newDemand.unit_id}`;


    if (demands.has(key)) {
      const existing = demands.get(key)!;
      existing.quantity_needed += newDemand.quantity_needed;
      demands.set(key, existing);
    } else {
      demands.set(key, {
        ...newDemand,
        safety_buffer: 1.0,
        quantity_with_buffer: newDemand.quantity_needed,
      });
    }
  }
}
```


#### Tarea 3.2: Endpoint de cálculo


`backend/src/controllers/events.controller.ts` (añadir):
```typescript
import { DemandCalculatorService } from '@/services/demand-calculator.service';


export class EventsController {
  // ... métodos existentes ...


  async calculateDemand(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // Verificar ownership
      const { data: event } = await supabase
        .from('events')
        .select('id, name, event_type')
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (!event) {
        throw new AppError(404, 'Event not found');
      }


      const calculator = new DemandCalculatorService();
      const demands = await calculator.calculateEventDemand(id);


      res.json({
        event: {
          id: event.id,
          name: event.name,
          type: event.event_type,
        },
        demands,
        total_items: demands.length,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error calculating demand:', error);
      res.status(500).json({ error: 'Failed to calculate demand' });
    }
  }
}
```


`backend/src/routes/events.routes.ts` (añadir):
```typescript
router.get('/:id/calculate-demand', controller.calculateDemand);
```


---


### **DÍA 4: Tests del Motor**


#### Tarea 4.1: Tests unitarios


`backend/tests/unit/demand-calculator.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemandCalculatorService } from '@/services/demand-calculator.service';
import { supabase } from '@/config/supabase';


vi.mock('@/config/supabase');


describe('DemandCalculatorService', () => {
  let service: DemandCalculatorService;


  beforeEach(() => {
    service = new DemandCalculatorService();
  });


  describe('BANQUET events', () => {
    it('should calculate exact demand: pax * quantity', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Boda García',
        event_type: 'BANQUET',
        pax: 100,
      };


      const mockMenus = [
        {
          recipe: {
            id: 'recipe-1',
            servings: 4,
            recipe_ingredients: [
              {
                quantity: 1.0, // 1kg para 4 raciones = 0.25kg por ración
                ingredient: {
                  id: 'ing-1',
                  name: 'Tomate',
                  family_id: 'family-1',
                },
                unit: { id: 'unit-kg', abbreviation: 'kg' },
              },
            ],
          },
        },
      ];


      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockEvent,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'event_menus') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockMenus,
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });


      const result = await service.calculateEventDemand('event-1');


      // 100 pax * 0.25kg = 25kg
      expect(result[0].quantity_needed).toBe(25);
    });
  });


  describe('A_LA_CARTE events', () => {
    it('should use qty_forecast instead of pax', async () => {
      const mockEvent = {
        id: 'event-2',
        event_type: 'A_LA_CARTE',
        pax: 100, // Ignorado
      };


      const mockMenus = [
        {
          qty_forecast: 30, // Solo 30 platos estimados
          recipe: {
            servings: 1,
            recipe_ingredients: [
              {
                quantity: 0.5, // 0.5kg por ración
                ingredient: {
                  id: 'ing-1',
                  name: 'Pasta',
                },
                unit: { id: 'unit-kg', abbreviation: 'kg' },
              },
            ],
          },
        },
      ];


      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockEvent,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'event_menus') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockMenus,
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });


      const result = await service.calculateEventDemand('event-2');


      // 30 forecast * 0.5kg = 15kg
      expect(result[0].quantity_needed).toBe(15);
    });
  });


  describe('SPORTS_MULTI events', () => {
    it('should combine direct ingredients + recipes', async () => {
      const mockEvent = {
        id: 'event-3',
        event_type: 'SPORTS_MULTI',
        pax: 50,
      };


      const mockDirectIngredients = [
        {
          quantity: 10,
          ingredient: {
            id: 'ing-pasta',
            name: 'Pasta Seca',
          },
          unit: { id: 'unit-kg', abbreviation: 'kg' },
        },
      ];


      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockEvent,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'event_direct_ingredients') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDirectIngredients,
                error: null,
              }),
            }),
          } as any;
        }
        if (table === 'event_menus') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });


      const result = await service.calculateEventDemand('event-3');


      expect(result.length).toBeGreaterThan(0);
      const pasta = result.find((d) => d.ingredient_id === 'ing-pasta');
      expect(pasta?.quantity_needed).toBe(10);
      expect(pasta?.source).toBe('DIRECT');
    });
  });
});
```


---


### **DÍA 5: Frontend - Calendario de Eventos**


#### Tarea 5.1: Componente de calendario


`frontend/src/components/events/EventCalendar.tsx`:
```tsx
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';


const EVENT_TYPE_COLORS = {
  BANQUET: 'bg-purple-100 text-purple-800',
  A_LA_CARTE: 'bg-blue-100 text-blue-800',
  COFFEE: 'bg-amber-100 text-amber-800',
  BUFFET: 'bg-green-100 text-green-800',
  SPORTS_MULTI: 'bg-red-100 text-red-800',
};


export function EventCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());


  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);


  const { data: events } = useEvents({
    start_date: monthStart.toISOString(),
    end_date: monthEnd.toISOString(),
  });


  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });


  const getEventsForDay = (day: Date) => {
    return events?.data?.filter((event) =>
      isSameDay(new Date(event.date_start), day)
    ) || [];
  };


  return (
    
      {/* Header */}
      
        
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        
        
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Hoy
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            
          
        
      


      {/* Calendar Grid */}
      
        {/* Day headers */}
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
          
            {day}
          
        ))}


        {/* Days */}
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());


          return (
            <div
              key={day.toISOString()}
              className={`min-h-[100px] rounded-lg border p-2 ${
                !isSameMonth(day, currentMonth)
                  ? 'bg-muted/30'
                  : isToday
                  ? 'border-primary bg-primary/5'
                  : 'bg-card'
              }`}
            >
              
                {format(day, 'd')}
              


              
                {dayEvents.map((event) => (
                  
                    {event.name}
                  
                ))}
              
            
          );
        })}
      
    
  );
}
```


#### Tarea 5.2: Página de eventos


`frontend/src/pages/Events.tsx`:
```tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventCalendar } from '@/components/events/EventCalendar';
import { EventForm } from '@/components/events/EventForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';


export default function Events() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);


  return (
    
      
        
          Eventos
          
            Planifica banquetes, menús y servicios especiales
          
        


        
          
            
              
              Nuevo Evento
            
          
          
            
              Crear Evento
            
            <EventForm onSuccess={() => setIsCreateOpen(false)} />
          
        
      


      
    
  );
}
```


---


## ✅ DEFINITION OF DONE - SPRINT 04


- [ ] CRUD de recetas implementado y testeado (≥90%)
- [ ] CRUD de eventos implementado y testeado (≥90%)
- [ ] Motor de cálculo de demanda con lógica diferenciada
- [ ] Tests unitarios del motor (casos BANQUET, A_LA_CARTE, SPORTS_MULTI)
- [ ] Ingredientes directos para SPORTS_MULTI funcional
- [ ] Frontend con calendario visual
- [ ] Tests E2E de flujo completo
- [ ] CI passing
- [ ] Documentación actualizada


---


Continuaré con **Sprint 05 y 06** en el siguiente mensaje (Órdenes de Compra + CSV Import + Kitchen Mode). ¿Continúo?
