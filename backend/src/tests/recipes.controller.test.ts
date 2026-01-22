import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipesController } from '@/controllers/recipes.controller';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any, error: any = null, count: number | null = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
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

describe('RecipesController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lists recipes', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'r1' }], null, 1));

        await controller.getAll(req, res);

        expect(res.json).toHaveBeenCalledWith({
            data: [{ id: 'r1' }],
            pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
        });
    });

    it('lists recipes with zero total', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([], null, 0));

        await controller.getAll(req, res);

        expect(res.json).toHaveBeenCalledWith({
            data: [],
            pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
        });
    });

    it('returns 500 when listing recipes fails', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: {} };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.getAll(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('lists recipes with search filter', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: { search: 'Rice', page: 2, limit: 10 } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'r1' }], null, 11));

        await controller.getAll(req, res);

        expect(res.json).toHaveBeenCalledWith({
            data: [{ id: 'r1' }],
            pagination: { total: 11, page: 2, limit: 10, totalPages: 2 },
        });
    });

    it('gets recipe by id', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'r1' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain({ id: 'r1' });
            if (table === 'recipe_ingredients') return createChain([{ id: 'ri1' }]);
            return createChain({});
        });

        await controller.getById(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: { id: 'r1', ingredients: [{ id: 'ri1' }] } });
    });

    it('gets recipe by id with no ingredients', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'r1' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain({ id: 'r1' });
            if (table === 'recipe_ingredients') return createChain(null);
            return createChain({});
        });

        await controller.getById(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: { id: 'r1', ingredients: [] } });
    });

    it('returns 404 when recipe not found', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'missing' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null));

        await controller.getById(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 when recipe ingredients fetch fails', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'r1' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain({ id: 'r1' });
            if (table === 'recipe_ingredients') return createChain(null, new Error('DB'));
            return createChain({});
        });

        await controller.getById(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('creates recipe', async () => {
        const controller = new RecipesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { name: 'R', servings: 2, ingredients: [{ ingredient_id: 'i1', quantity: 1, unit_id: 'u1' }] },
        };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain({ id: 'r1', servings: 2 });
            if (table === 'recipe_ingredients') return createChain([{ quantity: 1, ingredient: { cost_price: 2 } }]);
            return createChain({});
        });

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
    });

    it('creates recipe with default servings and missing ingredient cost', async () => {
        const controller = new RecipesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { name: 'R', servings: 0, ingredients: [{ ingredient_id: 'i1', quantity: 2, unit_id: 'u1' }] },
        };
        const res = mockRes();

        let recipeIngredientsCalls = 0;
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain({ id: 'r1' });
            if (table === 'recipe_ingredients') {
                recipeIngredientsCalls += 1;
                if (recipeIngredientsCalls === 1) return createChain([]);
                if (recipeIngredientsCalls === 2) return createChain([{ quantity: 2, ingredient: {} }]);
                return createChain(null);
            }
            return createChain({} as any);
        });

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 409 when recipe name already exists', async () => {
        const controller = new RecipesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { name: 'R', servings: 2 },
        };
        const res = mockRes();

        const chain = createChain(null, { code: '23505' });
        vi.spyOn(supabase, 'from').mockReturnValue(chain);

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('returns 500 when create fails', async () => {
        const controller = new RecipesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { name: 'R', servings: 2 },
        };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null, new Error('DB')));

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rolls back when ingredient insert fails', async () => {
        const controller = new RecipesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            body: { name: 'R', servings: 2, ingredients: [{ ingredient_id: 'i1', quantity: 1, unit_id: 'u1' }] },
        };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain({ id: 'r1', servings: 2 });
            if (table === 'recipe_ingredients') {
                const chain = createChain([], new Error('Insert failed'));
                chain.then = (resolve: any) => resolve({ data: null, error: new Error('Insert failed') });
                return chain;
            }
            return createChain({});
        });

        await controller.create(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('updates recipe', async () => {
        const controller = new RecipesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            params: { id: 'r1' },
            body: { name: 'R2', ingredients: [] },
        };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain({ id: 'r1', servings: 1 });
            if (table === 'recipe_ingredients') return createChain([]);
            return createChain({});
        });

        await controller.update(req, res);

        expect(res.json).toHaveBeenCalled();
    });

    it('updates recipe without changes or ingredients', async () => {
        const controller = new RecipesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            params: { id: 'r1' },
            body: {},
        };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain({ id: 'r1' });
            if (table === 'recipe_ingredients') return createChain(null);
            return createChain({});
        });

        await controller.update(req, res);

        expect(res.json).toHaveBeenCalled();
    });

    it('updates recipe with ingredients list', async () => {
        const controller = new RecipesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            params: { id: 'r1' },
            body: { ingredients: [{ ingredient_id: 'i1', quantity: 1, unit_id: 'u1' }] },
        };
        const res = mockRes();

        let recipeIngredientsCalls = 0;
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain({ id: 'r1', servings: 2 });
            if (table === 'recipe_ingredients') {
                recipeIngredientsCalls += 1;
                if (recipeIngredientsCalls === 1) return createChain([]); // delete
                if (recipeIngredientsCalls === 2) return createChain([]); // insert
                return createChain([{ quantity: 1, ingredient: { cost_price: 2 } }]);
            }
            return createChain({} as any);
        });

        await controller.update(req, res);

        expect(res.json).toHaveBeenCalled();
    });

    it('returns 404 when updating missing recipe', async () => {
        const controller = new RecipesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            params: { id: 'missing' },
            body: { name: 'R2' },
        };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null));

        await controller.update(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 when update fails', async () => {
        const controller = new RecipesController();
        const req: any = {
            user: { organizationIds: ['org-1'] },
            params: { id: 'r1' },
            body: { name: 'R2' },
        };
        const res = mockRes();

        let call = 0;
        vi.spyOn(supabase, 'from').mockImplementation(() => {
            call += 1;
            if (call === 1) return createChain({ id: 'r1' });
            throw new Error('DB');
        });

        await controller.update(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('deletes recipe', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'r1' } };
        const res = mockRes();

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'event_menus') return createChain([], null, 0);
            return createChain({});
        });

        await controller.delete(req, res);

        expect(res.json).toHaveBeenCalledWith({ message: 'Recipe deleted successfully' });
    });

    it('prevents delete when recipe has events', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'r1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'm1' }], null, 2));

        await controller.delete(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 when delete fails', async () => {
        const controller = new RecipesController();
        const req: any = { user: { organizationIds: ['org-1'] }, params: { id: 'r1' } };
        const res = mockRes();

        vi.spyOn(supabase, 'from').mockImplementation(() => {
            throw new Error('DB');
        });

        await controller.delete(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});
