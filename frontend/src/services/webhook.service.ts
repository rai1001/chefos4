import { api } from './api';

export interface Webhook {
    id: string;
    organization_id: string;
    url: string;
    events: string[];
    is_active: boolean;
    secret: string;
    created_at: string;
    updated_at: string;
}

export interface WebhookDelivery {
    id: string;
    webhook_id: string;
    event_type: string;
    payload: any;
    response_code?: number;
    response_body?: string;
    status: 'success' | 'failed' | 'pending';
    attempt_count: number;
    created_at: string;
    completed_at?: string;
}

export type CreateWebhookDTO = {
    url: string;
    events: string[];
    is_active?: boolean;
};

export type UpdateWebhookDTO = Partial<CreateWebhookDTO>;

export class WebhookService {
    async getAll() {
        const response = await api.get('/webhooks');
        return response.data;
    }

    async create(data: CreateWebhookDTO) {
        const response = await api.post('/webhooks', data);
        return response.data;
    }

    async update(id: string, data: UpdateWebhookDTO) {
        const response = await api.patch(`/webhooks/${id}`, data);
        return response.data;
    }

    async delete(id: string) {
        await api.delete(`/webhooks/${id}`);
    }

    async getHistory(id: string) {
        const response = await api.get(`/webhooks/${id}/history`);
        return response.data;
    }

    async testDispatch(id: string) {
        // Passing ID to backend to identify which webhook config to verify or just usage context
        // For now backend might ignore it but let's keep it consistent
        const response = await api.post('/webhooks/test/dispatch', { webhookId: id });
        return response.data;
    }
}

export const webhookService = new WebhookService();
