import { api } from './api';


export interface PurchaseOrderItem {
    id: string;
    purchase_order_id: string;
    ingredient_id: string;
    quantity_ordered: number;
    quantity_received: number;
    unit_id: string;
    unit_price: number;
    total_price: number;
    ingredient?: {
        id: string;
        name: string;
        cost_price: number;
    };
    unit?: {
        id: string;
        name: string;
        abbreviation: string;
    };
}


export interface PurchaseOrder {
    id: string;
    organization_id: string;
    supplier_id: string;
    event_id: string | null;
    status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
    order_date: string;
    delivery_date_estimated: string | null;
    delivery_date_actual: string | null;
    total_cost: number;
    supplier?: {
        id: string;
        name: string;
        contact_email?: string;
        contact_phone?: string;
    };
    event?: {
        id: string;
        name: string;
        date_start: string;
    };
    items?: PurchaseOrderItem[];
}


export const purchaseOrdersService = {
    async getAll(params?: {
        status?: string;
        supplier_id?: string;
        event_id?: string;
        page?: number;
        limit?: number;
    }) {
        const response = await api.get('/purchase-orders', { params });
        return response.data;
    },


    async getById(id: string) {
        const response = await api.get(`/purchase-orders/${id}`);
        return response.data.data;
    },


    async create(data: {
        supplier_id: string;
        event_id?: string;
        items: {
            ingredient_id: string;
            quantity_ordered: number;
            unit_id: string;
            unit_price?: number;
        }[];
    }) {
        const response = await api.post('/purchase-orders', data);
        return response.data.data;
    },


    async updateStatus(id: string, status: string) {
        const response = await api.patch(`/purchase-orders/${id}/status`, { status });
        return response.data.data;
    },


    async receiveItems(id: string, data: {
        delivery_date_actual?: string;
        items: {
            id: string;
            quantity_received: number;
        }[];
    }) {
        const response = await api.post(`/purchase-orders/${id}/receive`, data);
        return response.data.data;
    },


    async delete(id: string) {
        await api.delete(`/purchase-orders/${id}`);
    },
};
