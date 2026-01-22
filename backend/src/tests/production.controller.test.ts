import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductionController } from '@/controllers/production.controller';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: any) => resolve({ data, error }),
});

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('ProductionController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('gets tasks', async () => {
        const controller = new ProductionController();
        const req: any = { query: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 't1' }]));

        await controller.getTasks(req, res);
        expect(res.json).toHaveBeenCalledWith([{ id: 't1' }]);
    });

    it('gets tasks filtered by event', async () => {
        const controller = new ProductionController();
        const req: any = { query: { event_id: 'e1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 't1' }]));

        await controller.getTasks(req, res);
        expect(res.json).toHaveBeenCalledWith([{ id: 't1' }]);
    });

    it('returns 500 when task query fails', async () => {
        const controller = new ProductionController();
        const req: any = { query: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.getTasks(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('creates task', async () => {
        const controller = new ProductionController();
        const req: any = { body: { title: 'T' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 't1' }));

        await controller.createTask(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 500 when create fails', async () => {
        const controller = new ProductionController();
        const req: any = { body: { title: 'T' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.createTask(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('updates task', async () => {
        const controller = new ProductionController();
        const req: any = { params: { id: 't1' }, body: { title: 'T2' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 't1' }));

        await controller.updateTask(req, res);
        expect(res.json).toHaveBeenCalledWith({ id: 't1' });
    });

    it('returns 500 when update fails', async () => {
        const controller = new ProductionController();
        const req: any = { params: { id: 't1' }, body: { title: 'T2' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.updateTask(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('auto-generates tasks', async () => {
        const controller = new ProductionController();
        const req: any = { body: { event_id: 'e1', base_start_time: '2024-01-01' } };
        const res = mockRes();

        (supabase as any).rpc = vi.fn().mockResolvedValue({ data: 2, error: null });

        await controller.autoGenerateTasks(req, res);
        expect(res.json).toHaveBeenCalledWith({ message: 'Tasks generated successfully', count: 2 });
    });

    it('returns 500 when auto-generate fails', async () => {
        const controller = new ProductionController();
        const req: any = { body: { event_id: 'e1', base_start_time: '2024-01-01' } };
        const res = mockRes();

        (supabase as any).rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('RPC') });

        await controller.autoGenerateTasks(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
