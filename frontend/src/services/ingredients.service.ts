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


    async update(id: string, data: Partial<CreateIngredientDto>) {
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
