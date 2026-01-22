import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';

export class RecipesController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
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

    async getById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;

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

            const { data: ingredients, error: ingredientsError } = await supabase
                .from('recipe_ingredients')
                .select(`
          id,
          quantity,
          ingredient:ingredients (
            id,
            name,
            cost_price,
            unit:units (
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

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, description, servings, ingredients } = req.body;
            const organizationId = req.user!.organizationIds[0];

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
                    await supabase.from('recipes').delete().eq('id', recipe.id);
                    throw ingredientsError;
                }
            }

            await this.recalculateCosts(recipe.id);
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

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, description, servings, ingredients } = req.body;
            const orgIds = req.user!.organizationIds;

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

            if (name || description || servings) {
                await supabase.from('recipes').update({ name, description, servings }).eq('id', id);
            }

            if (ingredients) {
                await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
                if (ingredients.length > 0) {
                    const recipeIngredients = ingredients.map((ing: any) => ({
                        recipe_id: id,
                        ingredient_id: ing.ingredient_id,
                        quantity: ing.quantity,
                        unit_id: ing.unit_id,
                    }));
                    await supabase.from('recipe_ingredients').insert(recipeIngredients);
                }
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

    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;

            const { count } = await supabase.from('event_menus').select('id', { count: 'exact', head: true }).eq('recipe_id', id);
            if (count && count > 0) throw new AppError(400, `Cannot delete recipe used in ${count} events`);

            await supabase.from('recipes').update({ deleted_at: new Date().toISOString() }).eq('id', id).in('organization_id', orgIds);
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

    private async recalculateCosts(recipeId: string): Promise<void> {
        const { data: ingredients } = await supabase.from('recipe_ingredients').select('quantity, ingredient:ingredients (cost_price)').eq('recipe_id', recipeId);
        if (!ingredients || ingredients.length === 0) {
            await supabase.from('recipes').update({ total_cost: 0, cost_per_serving: 0 }).eq('id', recipeId);
            return;
        }
        const totalCost = (ingredients as any[]).reduce((sum, item) => sum + (item.quantity * (item.ingredient?.cost_price || 0)), 0);
        const { data: recipe } = await supabase.from('recipes').select('servings').eq('id', recipeId).single();
        const servings = recipe?.servings || 1;
        await supabase.from('recipes').update({ total_cost: totalCost, cost_per_serving: totalCost / servings }).eq('id', recipeId);
    }

    private async getRecipeComplete(recipeId: string): Promise<any> {
        const { data: recipe } = await supabase.from('recipes').select('*').eq('id', recipeId).single();
        const { data: ingredients } = await supabase.from('recipe_ingredients').select('id, quantity, ingredient:ingredients (id, name, cost_price, unit:units (id, name, abbreviation)), unit:units (id, name, abbreviation)').eq('recipe_id', recipeId);
        return { ...recipe, ingredients: ingredients || [] };
    }
}
