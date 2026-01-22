import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WasteController } from '@/controllers/waste.controller';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any, error: any = null) => {
    const chain: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data, error }),
        maybeSingle: vi.fn().mockResolvedValue({ data, error }),
        then: (resolve: any) => resolve({ data, error }),
    };
    return chain;
};

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('WasteController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('gets causes', async () => {
        const controller = new WasteController();
        const req: any = { user: { organizationIds: ['org-1'] } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'c1' }]));

        await controller.getCauses(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'c1' }] });
    });

    it('returns 500 when getting causes fails', async () => {
        const controller = new WasteController();
        const req: any = { user: { organizationIds: ['org-1'] } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.getCauses(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('creates cause', async () => {
        const controller = new WasteController();
        const req: any = { user: { organizationIds: ['org-1'] }, body: { name: 'Rotura' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'c1' }));

        await controller.createCause(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 500 when creating cause fails', async () => {
        const controller = new WasteController();
        const req: any = { user: { organizationIds: ['org-1'] }, body: { name: 'Rotura' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.createCause(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rejects missing name', async () => {
        const controller = new WasteController();
        const req: any = { user: { organizationIds: ['org-1'] }, body: { name: '' } };
        const res = mockRes();

        await controller.createCause(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('creates waste entry', async () => {
        const controller = new WasteController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { ingredient_id: 'ing-1', quantity: 2, waste_cause_id: 'wc-1' },
        };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') {
                return createChain({ cost_price: 5, stock_current: 10 });
            }
            return createChain({});
        });

        await controller.createWasteEntry(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('handles missing fields in waste entry', async () => {
        const controller = new WasteController();
        const req: any = { user: { organizationIds: ['org-1'] }, body: {} };
        const res = mockRes();

        await controller.createWasteEntry(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when ingredient not found', async () => {
        const controller = new WasteController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { ingredient_id: 'ing-1', quantity: 2, waste_cause_id: 'wc-1' },
        };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null));

        await controller.createWasteEntry(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 when logging waste fails', async () => {
        const controller = new WasteController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { ingredient_id: 'ing-1', quantity: 2, waste_cause_id: 'wc-1' },
        };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') {
                return createChain({ cost_price: 5, stock_current: 10 });
            }
            if (table === 'inventory_logs') {
                return createChain(null, new Error('DB'));
            }
            return createChain({});
        });

        await controller.createWasteEntry(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('returns 500 when stock update fails', async () => {
        const controller = new WasteController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { ingredient_id: 'ing-1', quantity: 2, waste_cause_id: 'wc-1' },
        };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        const ingredientsChain = createChain({ cost_price: 5, stock_current: 10 });
        ingredientsChain.update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB') }) });

        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') return ingredientsChain as any;
            if (table === 'inventory_logs') return createChain({});
            return createChain({});
        });

        await controller.createWasteEntry(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('gets stats', async () => {
        const controller = new WasteController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'log-1' }]));

        await controller.getStats(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'log-1' }] });
    });

    it('applies date filters when getting stats', async () => {
        const controller = new WasteController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: { startDate: '2024-01-01', endDate: '2024-01-31' } };
        const res = mockRes();

        const chain = createChain([{ id: 'log-1' }]);
        const gteSpy = vi.spyOn(chain, 'gte');
        const lteSpy = vi.spyOn(chain, 'lte');
        vi.spyOn(supabase, 'from').mockReturnValue(chain);

        await controller.getStats(req, res);

        expect(gteSpy).toHaveBeenCalled();
        expect(lteSpy).toHaveBeenCalled();
    });

    it('returns 500 when stats fetch fails', async () => {
        const controller = new WasteController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.getStats(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});
