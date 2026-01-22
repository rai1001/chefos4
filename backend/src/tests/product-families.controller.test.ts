import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductFamiliesController } from '@/controllers/product-families.controller';
import { supabase } from '@/config/supabase';
import { createSupabaseChain } from './helpers/supabase';

vi.mock('@/config/supabase');

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('ProductFamiliesController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lists families', async () => {
        const controller = new ProductFamiliesController();
        const req: any = { user: { organizationIds: ['org-1'] } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createSupabaseChain([{ id: 'f1' }]));

        await controller.getAll(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'f1' }], total: 1 });
    });

    it('returns 500 when listing families fails', async () => {
        const controller = new ProductFamiliesController();
        const req: any = { user: { organizationIds: ['org-1'] } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createSupabaseChain(null, new Error('DB')));

        await controller.getAll(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('gets family by id', async () => {
        const controller = new ProductFamiliesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'f1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createSupabaseChain({ id: 'f1' }));

        await controller.getById(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: { id: 'f1' } });
    });

    it('returns 500 when getById throws', async () => {
        const controller = new ProductFamiliesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'f1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockImplementation(() => {
            throw new Error('DB');
        });

        await controller.getById(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('creates family', async () => {
        const controller = new ProductFamiliesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { name: 'Veg', description: 'desc' },
        };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createSupabaseChain({ id: 'f1' }));

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 500 when create fails', async () => {
        const controller = new ProductFamiliesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { name: 'Veg', description: 'desc' },
        };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createSupabaseChain(null, new Error('DB')));

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('updates family', async () => {
        const controller = new ProductFamiliesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            params: { id: 'f1' },
            body: { name: 'Veg' },
        };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'product_families') {
                return createSupabaseChain({ id: 'f1' });
            }
            return createSupabaseChain({});
        });

        await controller.update(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: { id: 'f1' } });
    });

    it('returns 500 when update fails', async () => {
        const controller = new ProductFamiliesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            params: { id: 'f1' },
            body: { name: 'Veg' },
        };
        const res = mockRes();

        let call = 0;
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'product_families') {
                call += 1;
                if (call === 1) return createSupabaseChain({ id: 'f1' });
                return createSupabaseChain(null, new Error('DB'));
            }
            return createSupabaseChain({});
        });

        await controller.update(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('deletes family when no ingredients', async () => {
        const controller = new ProductFamiliesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'f1' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') {
                return createSupabaseChain([], null, 0);
            }
            if (table === 'product_families') {
                return createSupabaseChain({});
            }
            return createSupabaseChain({});
        });

        await controller.delete(req, res);

        expect(res.json).toHaveBeenCalledWith({ message: 'Product family deleted successfully' });
    });

    it('returns 500 when delete fails', async () => {
        const controller = new ProductFamiliesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'f1' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') {
                return createSupabaseChain([], null, 0);
            }
            if (table === 'product_families') {
                return createSupabaseChain(null, new Error('DB'));
            }
            return createSupabaseChain({});
        });

        await controller.delete(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('returns 404 when family not found', async () => {
        const controller = new ProductFamiliesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'f-missing' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createSupabaseChain(null));

        await controller.getById(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 409 when family name already exists', async () => {
        const controller = new ProductFamiliesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { name: 'Dup' },
        };
        const res = mockRes();

        const chain = createSupabaseChain(null);
        chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } });
        vi.spyOn(supabase, 'from').mockReturnValue(chain);

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('returns 404 when updating missing family', async () => {
        const controller = new ProductFamiliesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            params: { id: 'f-missing' },
            body: { name: 'Veg' },
        };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'product_families') {
                return createSupabaseChain(null);
            }
            return createSupabaseChain({});
        });

        await controller.update(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('prevents delete when family has ingredients', async () => {
        const controller = new ProductFamiliesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'f1' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') {
                return createSupabaseChain([{ id: 'ing-1' }], null, 1);
            }
            if (table === 'product_families') {
                return createSupabaseChain({});
            }
            return createSupabaseChain({});
        });

        await controller.delete(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });
});
