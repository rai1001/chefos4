import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventsController } from '@/controllers/events.controller';
import { supabase } from '@/config/supabase';
import { DemandCalculatorService } from '@/services/demand-calculator.service';
import { PurchaseOrderGeneratorService } from '@/services/purchase-order-generator.service';
import { EventImporterService } from '@/services/event-importer.service';

vi.mock('@/config/supabase');
vi.mock('@/services/demand-calculator.service', () => ({
    DemandCalculatorService: vi.fn().mockImplementation(() => ({
        calculateEventDemand: vi.fn().mockResolvedValue([{ id: 'd1' }]),
    })),
}));
vi.mock('@/services/purchase-order-generator.service', () => ({
    PurchaseOrderGeneratorService: vi.fn().mockImplementation(() => ({
        checkStockAvailability: vi.fn().mockResolvedValue({ has_sufficient_stock: true, missing_ingredients: [] }),
        generateFromEvent: vi.fn().mockResolvedValue([]),
    })),
}));
vi.mock('@/services/event-importer.service', () => ({
    EventImporterService: vi.fn().mockImplementation(() => ({
        analyzeCSV: vi.fn().mockResolvedValue({ total_rows: 1 }),
        executeImport: vi.fn().mockResolvedValue({ imported: 1 }),
    })),
}));

const createChain = (data: any, error: any = null, count: number | null = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: any) => resolve({ data, error, count }),
});

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('EventsController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lists events', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'e1' }], null, 1));

        await controller.getAll(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'e1' }], total: 1 });
    });

    it('lists events with zero total when count missing', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'e1' }], null, null));

        await controller.getAll(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'e1' }], total: 0 });
    });

    it('returns 500 when listing events fails', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.getAll(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('applies filters when listing events', async () => {
        const controller = new EventsController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            query: { start_date: '2024-01-01', end_date: '2024-01-31', event_type: 'BANQUET', status: 'DRAFT' },
        };
        const res = mockRes();

        const chain = createChain([{ id: 'e1' }], null, 1);
        const gteSpy = vi.spyOn(chain, 'gte');
        const lteSpy = vi.spyOn(chain, 'lte');
        const eqSpy = vi.spyOn(chain, 'eq');
        vi.spyOn(supabase, 'from').mockReturnValue(chain);

        await controller.getAll(req, res);

        expect(gteSpy).toHaveBeenCalled();
        expect(lteSpy).toHaveBeenCalled();
        expect(eqSpy).toHaveBeenCalled();
    });

    it('gets event by id', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e1', name: 'Event' });
            if (table === 'event_menus') return createChain([{ id: 'm1' }]);
            if (table === 'event_direct_ingredients') return createChain([{ id: 'di1' }]);
            return createChain({});
        });

        await controller.getById(req, res);

        expect(res.json).toHaveBeenCalled();
    });

    it('gets event by id with no menus or direct ingredients', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e1', name: 'Event' });
            if (table === 'event_menus') return createChain(null);
            if (table === 'event_direct_ingredients') return createChain(null);
            return createChain({});
        });

        await controller.getById(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: { id: 'e1', name: 'Event', menus: [], direct_ingredients: [] } });
    });

    it('returns 404 when event not found', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'missing' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null));

        await controller.getById(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 when event detail fetch fails', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e1', name: 'Event' });
            if (table === 'event_menus') throw new Error('DB');
            return createChain([]);
        });

        await controller.getById(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('creates event', async () => {
        const controller = new EventsController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { name: 'E', event_type: 'BANQUET', date_start: '2024-01-01', pax: 10 },
        };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'e1' }));

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('creates event with menus and direct ingredients', async () => {
        const controller = new EventsController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: {
                name: 'E',
                event_type: 'BANQUET',
                date_start: '2024-01-01',
                pax: 10,
                menus: [{ recipe_id: 'r1', qty_forecast: 2 }],
                direct_ingredients: [{ ingredient_id: 'i1', quantity: 1, unit_id: 'u1' }],
            },
        };
        const res = mockRes();

        const menuChain = createChain([]);
        const directChain = createChain([]);
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e1' });
            if (table === 'event_menus') return menuChain as any;
            if (table === 'event_direct_ingredients') return directChain as any;
            return createChain({});
        });

        await controller.create(req, res);

        expect(menuChain.insert).toHaveBeenCalled();
        expect(directChain.insert).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 500 when create event fails', async () => {
        const controller = new EventsController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { name: 'E', event_type: 'BANQUET', date_start: '2024-01-01', pax: 10 },
        };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('updates event', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' }, body: { name: 'E2' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'e1' }));

        await controller.update(req, res);

        expect(res.json).toHaveBeenCalled();
    });

    it('returns 404 when updating missing event', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'missing' }, body: { name: 'E2' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null));

        await controller.update(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 when update fails', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' }, body: { name: 'E2' } };
        const res = mockRes();

        let call = 0;
        vi.spyOn(supabase, 'from').mockImplementation(() => {
            call += 1;
            if (call === 1) return createChain({ id: 'e1' });
            return createChain(null, new Error('DB'));
        });

        await controller.update(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('deletes event', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({}));

        await controller.delete(req, res);

        expect(res.json).toHaveBeenCalledWith({ message: 'Event deleted successfully' });
    });

    it('returns 500 when delete fails', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockImplementation(() => {
            throw new Error('DB');
        });

        await controller.delete(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('calculates demand', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'e1', name: 'E', event_type: 'BANQUET' }));

        await controller.calculateDemand(req, res);

        expect(res.json).toHaveBeenCalled();
    });

    it('returns 404 when calculating demand for missing event', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'missing' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null));

        await controller.calculateDemand(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 when demand calculation fails', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'e1', name: 'E', event_type: 'BANQUET' }));
        (DemandCalculatorService as any).mockImplementationOnce(() => ({
            calculateEventDemand: vi.fn().mockRejectedValue(new Error('boom')),
        }));

        await controller.calculateDemand(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('generates purchase orders', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'e1', name: 'E' }));

        await controller.generatePurchaseOrders(req, res);

        expect(res.json).toHaveBeenCalled();
    });

    it('returns 404 when generating POs for missing event', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'missing' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null));

        await controller.generatePurchaseOrders(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 when generating POs fails', async () => {
        const controller = new EventsController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'e1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'e1', name: 'E' }));
        (PurchaseOrderGeneratorService as any).mockImplementationOnce(() => ({
            checkStockAvailability: vi.fn().mockRejectedValue(new Error('boom')),
            generateFromEvent: vi.fn().mockResolvedValue([]),
        }));

        await controller.generatePurchaseOrders(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('imports CSV (dry run)', async () => {
        const controller = new EventsController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { dryRun: 'true' },
            file: { buffer: Buffer.from('a') },
        };
        const res = mockRes();

        await controller.importCSV(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: { total_rows: 1 } });
    });

    it('imports CSV (execute)', async () => {
        const controller = new EventsController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { dryRun: 'false' },
            file: { buffer: Buffer.from('a') },
        };
        const res = mockRes();

        await controller.importCSV(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: { imported: 1 } });
    });

    it('returns 400 when importing CSV without file', async () => {
        const controller = new EventsController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { dryRun: 'true' },
        };
        const res = mockRes();

        await controller.importCSV(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 when CSV analysis fails', async () => {
        const controller = new EventsController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { dryRun: 'true' },
            file: { buffer: Buffer.from('a') },
        };
        const res = mockRes();

        (EventImporterService as any).mockImplementationOnce(() => ({
            analyzeCSV: vi.fn().mockRejectedValue(new Error('bad')),
            executeImport: vi.fn(),
        }));

        await controller.importCSV(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});
