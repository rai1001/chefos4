import { supabase } from '../config/supabase';
import crypto from 'crypto';

export class WebhookDispatcher {

    async dispatch(event: string, payload: any, organizationId: string): Promise<void> {
        // 1. Find interested webhooks
        const { data: webhooks, error } = await supabase
            .from('webhooks')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .contains('events', [event]);

        if (error || !webhooks || webhooks.length === 0) return;

        console.log(`[WebhookDispatcher] Found ${webhooks.length} webhooks for event ${event}`);

        // 2. Dispatch to each webhook
        // We do this without awaiting purely to not block the main threat? 
        // Ideally we use a queue, but for MVP we just fire promises.
        webhooks.forEach(webhook => this.sendWebhook(webhook, event, payload));
    }

    private async sendWebhook(webhook: any, event: string, payload: any) {
        const deliveryId = crypto.randomUUID();
        const timestamp = Date.now();
        const signature = this.signPayload(payload, webhook.secret, timestamp);

        // Log initial attempt? Or just log result. Let's log start.
        // Actually, we'll just log the result to keep DB writes lower.

        let status = 'pending';
        let responseCode = 0;
        let responseBody = '';

        try {
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ChefOS-Event': event,
                    'X-ChefOS-Signature': signature,
                    'X-ChefOS-Timestamp': timestamp.toString(),
                    'X-ChefOS-Delivery-ID': deliveryId
                },
                body: JSON.stringify(payload)
            });

            responseCode = response.status;
            status = response.ok ? 'success' : 'failed';
            responseBody = await response.text();

        } catch (err: any) {
            status = 'failed';
            responseBody = err.message || 'Network Error';
        }

        // Save delivery log
        await supabase.from('webhook_deliveries').insert({
            id: deliveryId,
            webhook_id: webhook.id,
            event_type: event,
            payload: payload,
            response_code: responseCode,
            response_body: responseBody.substring(0, 1000), // Truncate huge responses
            status: status,
            attempt_count: 1,
            completed_at: new Date().toISOString()
        });

        if (status === 'failed') {
            console.error(`[WebhookDispatcher] Failed to send to ${webhook.url}: ${responseBody}`);
        }
    }

    private signPayload(payload: any, secret: string, timestamp: number): string {
        const data = `${timestamp}.${JSON.stringify(payload)}`;
        return crypto.createHmac('sha256', secret).update(data).digest('hex');
    }
}

export const webhookDispatcher = new WebhookDispatcher();
