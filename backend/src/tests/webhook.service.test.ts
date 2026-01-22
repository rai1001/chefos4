import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from '@/services/webhook.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any, error: any = null) => ({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: any) => resolve({ data, error }),
});

describe('WebhookService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates webhook', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'w1' }) as any);
        const service = new WebhookService();
        const result = await service.createWebhook('org-1', { url: 'http://x', events: ['e1'] });
        expect(result).toEqual({ id: 'w1' });
    });

    it('throws when create fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, { message: 'fail' }) as any);
        const service = new WebhookService();
        await expect(service.createWebhook('org-1', { url: 'http://x' })).rejects.toThrow('fail');
    });

    it('gets webhooks', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'w1' }]) as any);
        const service = new WebhookService();
        const result = await service.getWebhooks('org-1');
        expect(result).toEqual([{ id: 'w1' }]);
    });

    it('returns empty list when no webhooks', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null) as any);
        const service = new WebhookService();
        const result = await service.getWebhooks('org-1');
        expect(result).toEqual([]);
    });

    it('throws when list fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, { message: 'fail' }) as any);
        const service = new WebhookService();
        await expect(service.getWebhooks('org-1')).rejects.toThrow('fail');
    });

    it('updates webhook', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'w1', is_active: true }) as any);
        const service = new WebhookService();
        const result = await service.updateWebhook('w1', 'org-1', { is_active: true });
        expect(result).toEqual({ id: 'w1', is_active: true });
    });

    it('throws when update fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, { message: 'fail' }) as any);
        const service = new WebhookService();
        await expect(service.updateWebhook('w1', 'org-1', { is_active: true })).rejects.toThrow('fail');
    });

    it('deletes webhook', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain({}) as any);
        const service = new WebhookService();
        await service.deleteWebhook('w1', 'org-1');
        expect(supabase.from).toHaveBeenCalledWith('webhooks');
    });

    it('throws when delete fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, { message: 'fail' }) as any);
        const service = new WebhookService();
        await expect(service.deleteWebhook('w1', 'org-1')).rejects.toThrow('fail');
    });

    it('gets delivery history', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'd1' }]) as any);
        const service = new WebhookService();
        const result = await service.getDeliveryHistory('w1');
        expect(result).toEqual([{ id: 'd1' }]);
    });

    it('returns empty history when none', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null) as any);
        const service = new WebhookService();
        const result = await service.getDeliveryHistory('w1');
        expect(result).toEqual([]);
    });

    it('throws when history fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, { message: 'fail' }) as any);
        const service = new WebhookService();
        await expect(service.getDeliveryHistory('w1')).rejects.toThrow('fail');
    });
});
