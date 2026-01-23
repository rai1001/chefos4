import { api } from './api';

export interface Event {
    id: string;
    name: string;
    event_type: 'BANQUET' | 'A_LA_CARTE' | 'SPORTS_MULTI' | 'COFFEE' | 'BUFFET';
    date_start: string;
    date_end: string;
    pax: number;
    status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    menus?: EventMenu[];
    direct_ingredients?: EventDirectIngredient[];
}

export interface EventMenu {
    id?: string;
    recipe_id: string;
    qty_forecast: number;
    recipe?: {
        id: string;
        name: string;
        cost_per_serving: number;
    };
}

export interface EventDirectIngredient {
    id?: string;
    ingredient_id: string;
    quantity: number;
    unit_id: string;
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

export interface CreateEventDto {
    name: string;
    event_type: 'BANQUET' | 'A_LA_CARTE' | 'SPORTS_MULTI' | 'COFFEE' | 'BUFFET';
    date_start: string;
    date_end: string;
    pax: number;
    menus?: { recipe_id: string; qty_forecast: number }[];
    direct_ingredients?: { ingredient_id: string; quantity: number; unit_id: string }[];
}

export interface UpdateEventDto extends Partial<CreateEventDto> { }

export const eventsService = {
    async getAll(params?: { start_date?: string; end_date?: string }) {
        const response = await api.get<{ data: Event[]; total: number }>(
            '/events',
            { params }
        );
        return response.data;
    },

    async getById(id: string) {
        const response = await api.get<{ data: Event }>(`/events/${id}`);
        return response.data.data;
    },

    async create(data: CreateEventDto) {
        const response = await api.post<{ data: Event }>('/events', data);
        return response.data.data;
    },

    async update(id: string, data: UpdateEventDto) {
        const response = await api.patch<{ data: Event }>(`/events/${id}`, data);
        return response.data.data;
    },

    async delete(id: string) {
        await api.delete(`/events/${id}`);
    },

    async generatePurchaseOrders(eventId: string) {
        const response = await api.post(`/events/${eventId}/generate-purchase-orders`);
        return response.data;
    }
};
