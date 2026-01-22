import { api } from './api';

export interface Supplier {
    id: string;
    name: string;
    contact_email?: string;
    contact_phone?: string;
    lead_time_days: number;
    cut_off_time?: string;
    delivery_days: number[];
    default_family_id?: string | null;
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
    default_family_id?: string | null;
}

export const suppliersService = {
    async getAll(search?: string) {
        const response = await api.get<{ data: Supplier[]; total: number }>(
            '/suppliers',
            { params: { search } }
        );
        return response.data;
    },

    async getById(id: string) {
        const response = await api.get<{ data: Supplier }>(`/suppliers/${id}`);
        return response.data.data;
    },

    async create(data: CreateSupplierDto) {
        const response = await api.post<{ data: Supplier }>('/suppliers', data);
        return response.data.data;
    },

    async update(id: string, data: Partial<CreateSupplierDto>) {
        const response = await api.patch<{ data: Supplier }>(`/suppliers/${id}`, data);
        return response.data.data;
    },

    async delete(id: string) {
        await api.delete(`/suppliers/${id}`);
    },

    async estimateDelivery(id: string, orderDate?: string) {
        const response = await api.get<{
            supplier_id: string;
            order_date: string;
            estimated_delivery: string;
        }>(`/suppliers/${id}/estimate-delivery`, {
            params: { order_date: orderDate },
        });
        return response.data;
    },

    async getWithCutoffStatus() {
        const response = await api.get<{ data: Supplier[] }>(
            '/suppliers/cutoff-status/all'
        );
        return response.data.data;
    },
};
