import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductionTasksController } from '@/controllers/production-tasks.controller';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: any) => resolve({ data, error }),
});

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('ProductionTasksController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lists tasks with dependencies', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: {} };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'production_tasks') return createChain([{ id: 't1' }]);
            if (table === 'task_dependencies') return createChain([{ successor_task_id: 't1', predecessor_task_id: 't0' }]);
            return createChain({});
        });

        await controller.getAll(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 't1', dependencies: ['t0'] }] });
    });

    it('lists tasks with filters and no dependencies', async () => {
        const controller = new ProductionTasksController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            query: { event_id: 'e1', start_date: '2024-01-01', end_date: '2024-01-02' },
        };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'production_tasks') return createChain([{ id: 't1' }]);
            if (table === 'task_dependencies') return createChain([]);
            return createChain({});
        });

        await controller.getAll(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 't1', dependencies: [] }] });
    });

    it('returns 500 when dependencies query fails', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: {} };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'production_tasks') return createChain([{ id: 't1' }]);
            if (table === 'task_dependencies') return createChain(null, new Error('DB'));
            return createChain({});
        });

        await controller.getAll(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('creates task', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, body: { title: 'T' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 't1' }));

        await controller.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 500 when create fails', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, body: { title: 'T' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.create(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('updates task', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 't1' }, body: { title: 'T2' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 't1' }));

        await controller.update(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('returns 500 when update fails', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 't1' }, body: { title: 'T2' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.update(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('deletes task', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 't1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({}));

        await controller.delete(req, res);
        expect(res.json).toHaveBeenCalledWith({ message: 'Task deleted successfully' });
    });

    it('returns 500 when delete fails', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 't1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('generates tasks from event', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { eventId: 'e1' }, body: {} };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e1' });
            return createChain({});
        });
        (supabase as any).rpc = vi.fn().mockResolvedValue({ data: 3, error: null });

        await controller.generateFromEvent(req, res);
        expect(res.json).toHaveBeenCalledWith({ message: 'Tasks generated successfully', count: 3 });
    });

    it('returns 404 when event not found for generation', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { eventId: 'missing' }, body: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null));

        await controller.generateFromEvent(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 when RPC fails', async () => {
        const controller = new ProductionTasksController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { eventId: 'e1' }, body: {} };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e1' });
            return createChain({});
        });
        (supabase as any).rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('RPC') });

        await controller.generateFromEvent(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
