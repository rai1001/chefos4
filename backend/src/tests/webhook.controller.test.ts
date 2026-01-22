import { describe, it, expect, vi } from 'vitest';
import { WebhookController } from '@/controllers/webhook.controller';

vi.mock('@/services/webhook.service', () => ({
    webhookService: {
        createWebhook: vi.fn().mockResolvedValue({ id: 'w1' }),
        getWebhooks: vi.fn().mockResolvedValue([{ id: 'w1' }]),
        updateWebhook: vi.fn().mockResolvedValue({ id: 'w1', active: true }),
        deleteWebhook: vi.fn().mockResolvedValue(undefined),
        getDeliveryHistory: vi.fn().mockResolvedValue([{ id: 'd1' }]),
    },
}));

vi.mock('@/services/webhook-dispatcher.service', () => ({
    webhookDispatcher: {
        dispatch: vi.fn().mockResolvedValue(undefined),
    },
}));

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    return res;
};

describe('WebhookController', () => {
    it('creates webhook', async () => {
        const controller = new WebhookController();
        const req: any = { user: { organizationId: 'org-1' }, body: { url: 'http://x' } };
        const res = mockRes();

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ id: 'w1' });
    });

    it('returns 400 when creating without organization', async () => {
        const controller = new WebhookController();
        const req: any = { user: {}, body: { url: 'http://x' } };
        const res = mockRes();

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('lists webhooks', async () => {
        const controller = new WebhookController();
        const req: any = { user: { organizationId: 'org-1' } };
        const res = mockRes();

        await controller.list(req, res);

        expect(res.json).toHaveBeenCalledWith([{ id: 'w1' }]);
    });

    it('returns 400 when listing without organization', async () => {
        const controller = new WebhookController();
        const req: any = { user: {} };
        const res = mockRes();

        await controller.list(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('updates webhook', async () => {
        const controller = new WebhookController();
        const req: any = { user: { organizationId: 'org-1' }, params: { id: 'w1' }, body: { active: true } };
        const res = mockRes();

        await controller.update(req, res);

        expect(res.json).toHaveBeenCalledWith({ id: 'w1', active: true });
    });

    it('returns 400 when updating without organization', async () => {
        const controller = new WebhookController();
        const req: any = { user: {}, params: { id: 'w1' }, body: { active: true } };
        const res = mockRes();

        await controller.update(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('deletes webhook', async () => {
        const controller = new WebhookController();
        const req: any = { user: { organizationId: 'org-1' }, params: { id: 'w1' } };
        const res = mockRes();

        await controller.delete(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.send).toHaveBeenCalled();
    });

    it('returns 400 when deleting without organization', async () => {
        const controller = new WebhookController();
        const req: any = { user: {}, params: { id: 'w1' } };
        const res = mockRes();

        await controller.delete(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('gets history', async () => {
        const controller = new WebhookController();
        const req: any = { user: { organizationId: 'org-1' }, params: { id: 'w1' } };
        const res = mockRes();

        await controller.getHistory(req, res);

        expect(res.json).toHaveBeenCalledWith([{ id: 'd1' }]);
    });

    it('returns 400 when getting history without organization', async () => {
        const controller = new WebhookController();
        const req: any = { user: {}, params: { id: 'w1' } };
        const res = mockRes();

        await controller.getHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('dispatches test event', async () => {
        const controller = new WebhookController();
        const req: any = { user: { organizationId: 'org-1' } };
        const res = mockRes();

        await controller.testDispatch(req, res);

        expect(res.json).toHaveBeenCalledWith({ message: 'Test event dispatched' });
    });

    it('returns 400 when dispatching without organization', async () => {
        const controller = new WebhookController();
        const req: any = { user: {} };
        const res = mockRes();

        await controller.testDispatch(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });
});
