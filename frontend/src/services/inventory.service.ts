import { api } from './api';

export interface InventoryBatch {
    id: string;
    ingredient_id: string;
    unit_id: string;
    quantity_received: number;
    quantity_current: number;
    received_at: string;
    expiry_date?: string | null;
    lot_code?: string | null;
    storage_location_id?: string | null;
    ingredient?: { id: string; name: string; barcode?: string };
    unit?: { id: string; name: string; abbreviation: string };
    location?: { id: string; name: string; type?: string | null };
}

export interface StorageLocation {
    id: string;
    name: string;
    type?: string | null;
}

export const inventoryService = {
    async listBatches(params?: { ingredient_id?: string; expiring_in_days?: number; location_id?: string }) {
        const response = await api.get('/inventory/batches', { params });
        return response.data.data as InventoryBatch[];
    },

    async updateBatch(id: string, payload: { expiry_date?: string | null; storage_location_id?: string | null; lot_code?: string | null }) {
        const response = await api.patch(`/inventory/batches/${id}`, payload);
        return response.data.data as InventoryBatch;
    },

    async scanExpiry(batchId: string, file: File) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/inventory/batches/${batchId}/expiry/scan`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data as { candidates: { date: string; confidence: number; raw: string }[] };
    },

    async stockOut(payload: {
        barcode?: string;
        ingredient_id?: string;
        quantity: number;
        movement_type?: 'OUT' | 'WASTE' | 'ADJUSTMENT';
        notes?: string;
        production_order_id?: string;
        save_barcode?: boolean;
    }) {
        const response = await api.post('/inventory/stock-out', payload);
        return response.data.data as { movement_id: string; batches: any[] };
    },

    async listLocations() {
        const response = await api.get('/inventory/locations');
        return response.data.data as StorageLocation[];
    },

    async createLocation(payload: { name: string; type?: string | null }) {
        const response = await api.post('/inventory/locations', payload);
        return response.data.data as StorageLocation;
    },

    async updateLocation(id: string, payload: { name?: string; type?: string | null }) {
        const response = await api.patch(`/inventory/locations/${id}`, payload);
        return response.data.data as StorageLocation;
    },

    async deleteLocation(id: string) {
        const response = await api.delete(`/inventory/locations/${id}`);
        return response.data.data as { deleted: boolean };
    },
};
