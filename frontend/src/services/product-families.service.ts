import { api } from './api';

export interface ProductFamily {
    id: string;
    name: string;
    description?: string;
    safety_buffer_pct?: number;
}

export const productFamiliesService = {
    async getAll() {
        const response = await api.get('/product-families');
        return response.data.data as ProductFamily[];
    },
};
