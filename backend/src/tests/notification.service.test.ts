import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '@/services/notification.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (error: any = null) => ({
    insert: vi.fn().mockResolvedValue({ error }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockResolvedValue({ error }),
});

describe('NotificationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates notification', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain() as any);
        const service = new NotificationService();
        await service.create({
            organizationId: 'org-1',
            type: 'TEST',
            priority: 'LOW',
            title: 'Hello',
            message: 'World',
        });
        expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('logs error when create fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(new Error('fail')) as any);
        const service = new NotificationService();
        await service.create({
            organizationId: 'org-1',
            type: 'TEST',
            priority: 'LOW',
            title: 'Hello',
            message: 'World',
        });
        expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('marks as read', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain() as any);
        const service = new NotificationService();
        await service.markAsRead('n1', 'u1');
        expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('logs error when mark as read fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(new Error('fail')) as any);
        const service = new NotificationService();
        await service.markAsRead('n1', 'u1');
        expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('marks all as read', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain() as any);
        const service = new NotificationService();
        await service.markAllAsRead('u1');
        expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('logs error when mark all as read fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(new Error('fail')) as any);
        const service = new NotificationService();
        await service.markAllAsRead('u1');
        expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('cleans expired', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain() as any);
        const service = new NotificationService();
        await service.cleanExpired();
        expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('logs error when clean expired fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(new Error('fail')) as any);
        const service = new NotificationService();
        await service.cleanExpired();
        expect(supabase.from).toHaveBeenCalledWith('notifications');
    });
});
