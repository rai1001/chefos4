import { api } from './api';

export interface Preparation {
    id: string;
    name: string;
    unit_id: string;
    default_shelf_life_days: number;
    station?: string | null;
    notes?: string | null;
    active: boolean;
    unit?: { id: string; name: string; abbreviation: string };
}

export interface PreparationBatch {
    id: string;
    preparation_id: string;
    produced_at: string;
    quantity_produced: number;
    quantity_current: number;
    expiry_date?: string | null;
    lot_code?: string | null;
    storage_location_id?: string | null;
    preparation?: { id: string; name: string; unit?: { abbreviation: string } };
    location?: { id: string; name: string };
}

export const preparationsService = {
    async list() {
        const response = await api.get('/preparations');
        return response.data.data as Preparation[];
    },

    async create(payload: {
        name: string;
        unit_id: string;
        default_shelf_life_days?: number | null;
        station?: string | null;
        notes?: string | null;
        active?: boolean;
    }) {
        const response = await api.post('/preparations', payload);
        return response.data.data as Preparation;
    },

    async update(id: string, payload: Partial<Preparation>) {
        const response = await api.patch(`/preparations/${id}`, payload);
        return response.data.data as Preparation;
    },

    async createBatch(preparationId: string, payload: {
        produced_at: string;
        quantity_produced: number;
        expiry_date?: string | null;
        lot_code?: string | null;
        storage_location_id?: string | null;
        ingredients: Array<{ ingredient_id: string; unit_id: string; quantity_used: number }>;
    }) {
        const response = await api.post(`/preparations/${preparationId}/batches`, payload);
        return response.data.data as PreparationBatch;
    },

    async listBatches(params?: { expiring_in_days?: number; location_id?: string }) {
        const response = await api.get('/preparations/batches', { params });
        return response.data.data as PreparationBatch[];
    },

    async updateBatch(id: string, payload: {
        expiry_date?: string | null;
        storage_location_id?: string | null;
        quantity_current?: number;
        lot_code?: string | null;
    }) {
        const response = await api.patch(`/preparations/batches/${id}`, payload);
        return response.data.data as PreparationBatch;
    },

    async printLabels(id: string, labelCount: number) {
        const response = await api.post(
            `/preparations/batches/${id}/labels/print`,
            { label_count: labelCount },
            { responseType: 'blob' }
        );
        return response.data as Blob;
    },

    async scanExpiry(id: string, file: File) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/preparations/batches/${id}/expiry/scan`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data as { candidates: { date: string; confidence: number; raw: string }[] };
    },
};
