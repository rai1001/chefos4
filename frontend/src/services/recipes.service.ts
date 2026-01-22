import { api } from './api';

export interface Recipe {
    id: string;
    name: string;
    description?: string;
    servings: number;
    total_cost: number;
    cost_per_serving: number;
    ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
    id: string;
    ingredient_id: string;
    quantity: number;
    unit_id: string;
    ingredient?: {
        id: string;
        name: string;
        cost_price: number;
        unit: {
            id: string;
            name: string;
            abbreviation: string;
        };
    };
    unit?: {
        id: string;
        name: string;
        abbreviation: string;
    };
}

export const recipesService = {
    async getAll(search?: string) {
        const response = await api.get<{ data: Recipe[]; pagination: any }>(
            '/recipes',
            { params: { search, limit: 100 } }
        );
        return response.data;
    },

    async getById(id: string) {
        const response = await api.get<{ data: Recipe }>(`/recipes/${id}`);
        return response.data.data;
    }
};
