import { api } from './api';

export interface DeliveryNoteItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    ingredient_id?: string | null;
    unit_id?: string | null;
    status: string;
    lot_code?: string | null;
    expiry_date?: string | null;
    storage_location_id?: string | null;
}

export interface DeliveryNote {
    id: string;
    status: string;
    total_amount?: number;
    image_url?: string;
    created_at: string;
    items?: DeliveryNoteItem[];
}

export const deliveryNotesService = {
    async list() {
        const response = await api.get('/delivery-notes');
        return response.data.data as DeliveryNote[];
    },

    async getById(id: string) {
        const response = await api.get(`/delivery-notes/${id}`);
        return response.data.data as DeliveryNote;
    },

    async updateItem(id: string, payload: Partial<DeliveryNoteItem>) {
        const response = await api.patch(`/delivery-notes/items/${id}`, payload);
        return response.data.data as DeliveryNoteItem;
    },

    async importToInventory(id: string, item_updates?: Partial<DeliveryNoteItem>[]) {
        const response = await api.post(`/delivery-notes/${id}/import-to-inventory`, {
            item_updates,
        });
        return response.data.data as { created_batches: string[]; unmatched_items: DeliveryNoteItem[] };
    },
};
