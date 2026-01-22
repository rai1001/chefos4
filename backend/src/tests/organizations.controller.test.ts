import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationsController } from '@/controllers/organizations.controller';
import { supabase } from '@/config/supabase';
import { createSupabaseChain } from './helpers/supabase';

vi.mock('@/config/supabase');

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('OrganizationsController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lists organizations', async () => {
        const controller = new OrganizationsController();
        const req: any = { user: { id: 'user-1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createSupabaseChain([{ id: 'org-1' }]));

        await controller.getAll(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'org-1' }] });
    });

    it('creates organization', async () => {
        const controller = new OrganizationsController();
        const req: any = { user: { id: 'user-1' }, body: { name: 'Org' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organizations') {
                return createSupabaseChain({ id: 'org-1', name: 'Org' });
            }
            return createSupabaseChain({});
        });

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 500 when listing organizations fails', async () => {
        const controller = new OrganizationsController();
        const req: any = { user: { id: 'user-1' } };
        const res = mockRes();

        const chain = createSupabaseChain(null);
        chain.then = (resolve: any) => resolve({ data: null, error: new Error('DB') });
        vi.spyOn(supabase, 'from').mockReturnValue(chain);

        await controller.getAll(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('returns 500 when organization creation fails', async () => {
        const controller = new OrganizationsController();
        const req: any = { user: { id: 'user-1' }, body: { name: 'Org' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organizations') {
                const chain = createSupabaseChain(null);
                chain.single = vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') });
                return chain;
            }
            return createSupabaseChain({});
        });

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('returns 500 when membership creation fails', async () => {
        const controller = new OrganizationsController();
        const req: any = { user: { id: 'user-1' }, body: { name: 'Org' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organizations') {
                return createSupabaseChain({ id: 'org-1', name: 'Org' });
            }
            if (table === 'organization_members') {
                const chain = createSupabaseChain({});
                chain.then = (resolve: any) => resolve({ data: null, error: new Error('Insert failed') });
                return chain;
            }
            return createSupabaseChain({});
        });

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});
