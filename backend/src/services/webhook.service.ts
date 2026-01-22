import { supabase } from '../config/supabase';

export interface Webhook {
    id: string;
    organization_id: string;
    url: string;
    secret: string;
    events: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WebhookDelivery {
    id: string;
    webhook_id: string;
    event_type: string;
    payload: any;
    response_code: number;
    response_body: string;
    status: 'success' | 'failed' | 'pending';
    attempt_count: number;
    created_at: string;
    completed_at: string;
}

export class WebhookService {
    async createWebhook(organizationId: string, data: Partial<Webhook>): Promise<Webhook> {
        const secret = 'whsec_' + Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('hex');

        const { data: webhook, error } = await supabase
            .from('webhooks')
            .insert({
                organization_id: organizationId,
                url: data.url,
                secret: secret, // In a real app, maybe only show this once. For now, we store plain or encrypted? Plan said plain is generated.
                events: data.events || [],
                is_active: true
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return webhook;
    }

    async getWebhooks(organizationId: string): Promise<Webhook[]> {
        const { data, error } = await supabase
            .from('webhooks')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    async updateWebhook(id: string, organizationId: string, updates: Partial<Webhook>): Promise<Webhook> {
        const { data, error } = await supabase
            .from('webhooks')
            .update(updates)
            .eq('id', id)
            .eq('organization_id', organizationId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async deleteWebhook(id: string, organizationId: string): Promise<void> {
        const { error } = await supabase
            .from('webhooks')
            .delete()
            .eq('id', id)
            .eq('organization_id', organizationId);

        if (error) throw new Error(error.message);
    }

    async getDeliveryHistory(webhookId: string): Promise<WebhookDelivery[]> {
        const { data, error } = await supabase
            .from('webhook_deliveries')
            .select('*')
            .eq('webhook_id', webhookId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw new Error(error.message);
        return data || [];
    }
}

export const webhookService = new WebhookService();
