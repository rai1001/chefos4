import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationController } from '@/controllers/notification.controller';
import { supabase } from '@/config/supabase';

const notificationMocks = vi.hoisted(() => ({
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
}));

vi.mock('@/config/supabase');
vi.mock('@/services/notification.service', () => ({
    NotificationService: vi.fn().mockImplementation(() => ({
        markAsRead: notificationMocks.markAsRead,
        markAllAsRead: notificationMocks.markAllAsRead,
    })),
}));

const createChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data, error }),
});

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('NotificationController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lists notifications', async () => {
        const controller = new NotificationController();
        const req: any = { user: { id: 'u1', organizationIds: ['org-1'] } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'n1' }]));

        await controller.list(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'n1' }] });
    });

    it('returns 500 when list fails', async () => {
        const controller = new NotificationController();
        const req: any = { user: { id: 'u1', organizationIds: ['org-1'] } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.list(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('marks notification as read', async () => {
        const controller = new NotificationController();
        const req: any = { user: { id: 'u1' }, params: { id: 'n1' } };
        const res = mockRes();

        await controller.markAsRead(req, res);

        expect(res.json).toHaveBeenCalledWith({ message: 'Notification marked as read' });
    });

    it('returns 500 when mark as read fails', async () => {
        const controller = new NotificationController();
        const req: any = { user: { id: 'u1' }, params: { id: 'n1' } };
        const res = mockRes();

        notificationMocks.markAsRead.mockRejectedValueOnce(new Error('fail'));

        await controller.markAsRead(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('marks all as read', async () => {
        const controller = new NotificationController();
        const req: any = { user: { id: 'u1' } };
        const res = mockRes();

        await controller.markAllAsRead(req, res);

        expect(res.json).toHaveBeenCalledWith({ message: 'All notifications marked as read' });
    });

    it('returns 500 when mark all as read fails', async () => {
        const controller = new NotificationController();
        const req: any = { user: { id: 'u1' } };
        const res = mockRes();

        notificationMocks.markAllAsRead.mockRejectedValueOnce(new Error('fail'));

        await controller.markAllAsRead(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});
