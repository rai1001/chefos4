import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookDispatcher } from '@/services/webhook-dispatcher.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    then: (resolve: any) => resolve({ data, error: null }),
});

describe('WebhookDispatcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('dispatches to webhooks', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'webhooks') {
                return createChain([{ id: 'w1', url: 'http://example.com', secret: 's', events: ['e1'] }]) as any;
            }
            if (table === 'webhook_deliveries') {
                return createChain({}) as any;
            }
            return createChain({}) as any;
        });

        const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
            status: 200,
            ok: true,
            text: async () => 'ok',
        } as any);

        const dispatcher = new WebhookDispatcher();
        await dispatcher.dispatch('e1', { hello: 'world' }, 'org-1');

        expect(fetchSpy).toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    it('no-op when no webhooks', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([]) as any);
        const dispatcher = new WebhookDispatcher();
        await dispatcher.dispatch('e1', {}, 'org-1');
        expect(supabase.from).toHaveBeenCalledWith('webhooks');
    });

    it('signPayload produces hash', async () => {
        const dispatcher = new WebhookDispatcher() as any;
        const sig = dispatcher.signPayload({ a: 1 }, 'secret', 123);
        expect(sig).toMatch(/[a-f0-9]{64}/);
    });
});
