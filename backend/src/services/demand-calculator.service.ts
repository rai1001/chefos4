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
    async calculateEventDemand(eventId: string): Promise<IngredientDemand[]> {
        try {
            const { data: event, error: eventError } = await supabase.from('events').select('*').eq('id', eventId).single();
            if (eventError || !event) throw new Error('Event not found');

            const demands: Map<string, IngredientDemand> = new Map();

            if (event.event_type === 'BANQUET' || event.event_type === 'COFFEE' || event.event_type === 'BUFFET') {
                await this.calculateBanquetDemand(event, demands);
            } else if (event.event_type === 'A_LA_CARTE') {
                await this.calculateALaCarteDemand(event, demands);
            } else if (event.event_type === 'SPORTS_MULTI') {
                await this.calculateSportsMultiDemand(event, demands);
            } else {
                await this.calculateBanquetDemand(event, demands);
            }

            await this.applySafetyBuffers(demands);
            return Array.from(demands.values());
        } catch (error) {
            logger.error('Error calculating demand:', error);
            throw error;
        }
    }

    private async calculateBanquetDemand(event: any, demands: Map<string, IngredientDemand>): Promise<void> {
        const { data: menus } = await supabase.from('event_menus').select('recipe:recipes (id, servings, recipe_ingredients (quantity, ingredient:ingredients (id, name, family_id), unit:units (id, abbreviation)))').eq('event_id', event.id);
        if (!menus) return;
        for (const menu of menus as any[]) {
            const recipe = menu.recipe;
            const servings = recipe.servings || 1;
            for (const recipeIng of recipe.recipe_ingredients) {
                const qtyPerServing = recipeIng.quantity / servings;
                this.addDemand(demands, {
                    ingredient_id: recipeIng.ingredient.id,
                    ingredient_name: recipeIng.ingredient.name,
                    quantity_needed: event.pax * qtyPerServing,
                    unit_id: recipeIng.unit.id,
                    unit_abbr: recipeIng.unit.abbreviation,
                    source: 'RECIPE'
                });
            }
        }
    }

    private async calculateALaCarteDemand(event: any, demands: Map<string, IngredientDemand>): Promise<void> {
        const { data: menus } = await supabase.from('event_menus').select('qty_forecast, recipe:recipes (id, servings, recipe_ingredients (quantity, ingredient:ingredients (id, name, family_id), unit:units (id, abbreviation)))').eq('event_id', event.id);
        if (!menus) return;
        for (const menu of menus as any[]) {
            const recipe = menu.recipe;
            const servings = recipe.servings || 1;
            const forecast = menu.qty_forecast || 0;
            for (const recipeIng of recipe.recipe_ingredients) {
                const qtyPerServing = recipeIng.quantity / servings;
                this.addDemand(demands, {
                    ingredient_id: recipeIng.ingredient.id,
                    ingredient_name: recipeIng.ingredient.name,
                    quantity_needed: forecast * qtyPerServing,
                    unit_id: recipeIng.unit.id,
                    unit_abbr: recipeIng.unit.abbreviation,
                    source: 'RECIPE'
                });
            }
        }
    }

    private async calculateSportsMultiDemand(event: any, demands: Map<string, IngredientDemand>): Promise<void> {
        const { data: directIngredients } = await supabase.from('event_direct_ingredients').select('quantity, ingredient:ingredients (id, name, family_id), unit:units (id, abbreviation)').eq('event_id', event.id);
        if (directIngredients) {
            for (const item of directIngredients as any[]) {
                this.addDemand(demands, {
                    ingredient_id: item.ingredient.id,
                    ingredient_name: item.ingredient.name,
                    quantity_needed: item.quantity,
                    unit_id: item.unit.id,
                    unit_abbr: item.unit.abbreviation,
                    source: 'DIRECT'
                });
            }
        }
        await this.calculateBanquetDemand(event, demands);
    }

    private async applySafetyBuffers(demands: Map<string, IngredientDemand>): Promise<void> {
        for (const [key, demand] of demands) {
            const { data: ingredient } = await supabase.from('ingredients').select('family:product_families (safety_buffer_pct)').eq('id', demand.ingredient_id).single();
            const buffer = (ingredient as any)?.family?.safety_buffer_pct || 1.10;
            demand.safety_buffer = buffer;
            demand.quantity_with_buffer = demand.quantity_needed * buffer;
            demands.set(key, demand);
        }
    }

    private addDemand(demands: Map<string, IngredientDemand>, newDemand: Omit<IngredientDemand, 'safety_buffer' | 'quantity_with_buffer'>): void {
        const key = `${newDemand.ingredient_id}_${newDemand.unit_id}`;
        if (demands.has(key)) {
            const existing = demands.get(key)!;
            existing.quantity_needed += newDemand.quantity_needed;
        } else {
            demands.set(key, { ...newDemand, safety_buffer: 1.0, quantity_with_buffer: newDemand.quantity_needed });
        }
    }
}
