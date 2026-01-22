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

export interface CycleCount {
    id: string;
    name: string;
    status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
    location_id?: string | null;
    created_at: string;
    completed_at?: string | null;
}

export interface CycleCountItem {
    id: string;
    ingredient_id: string;
    batch_id?: string | null;
    expected_qty: number;
    counted_qty: number;
    variance_qty: number;
    unit_id?: string | null;
    notes?: string | null;
    ingredient?: { id: string; name: string };
    batch?: { id: string; expiry_date?: string | null; lot_code?: string | null };
    unit?: { id: string; name: string; abbreviation: string };
}

export interface InventoryAlert {
    id: string;
    type: 'EXPIRING_SOON' | 'EXPIRED' | 'LOW_STOCK';
    entity_type: 'BATCH' | 'INGREDIENT' | 'PREPARATION_BATCH';
    entity_id: string;
    severity: 'INFO' | 'WARN' | 'CRITICAL';
    created_at: string;
    resolved_at?: string | null;
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

    async listCycleCounts() {
        const response = await api.get('/inventory/cycle-counts');
        return response.data.data as CycleCount[];
    },

    async getCycleCount(id: string) {
        const response = await api.get(`/inventory/cycle-counts/${id}`);
        return response.data.data as CycleCount & { items: CycleCountItem[] };
    },

    async createCycleCount(payload: { name: string; location_id?: string | null }) {
        const response = await api.post('/inventory/cycle-counts', payload);
        return response.data.data as CycleCount;
    },

    async updateCycleCountItems(id: string, items: { id: string; counted_qty: number; notes?: string | null }[]) {
        const response = await api.patch(`/inventory/cycle-counts/${id}/items`, { items });
        return response.data.data as { updated: boolean };
    },

    async completeCycleCount(id: string) {
        const response = await api.post(`/inventory/cycle-counts/${id}/complete`);
        return response.data.data as { completed: boolean };
    },

    async listAlerts(status?: 'OPEN' | 'RESOLVED') {
        const response = await api.get('/inventory/alerts', { params: status ? { status } : undefined });
        return response.data.data as InventoryAlert[];
    },

    async resolveAlert(id: string) {
        const response = await api.patch(`/inventory/alerts/${id}/resolve`);
        return response.data.data as InventoryAlert;
    },
};
