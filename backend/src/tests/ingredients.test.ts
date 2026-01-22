import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { supabase } from '@/config/supabase';
import jwt from 'jsonwebtoken';
import { CSVImporterService } from '@/services/csv-importer.service';

vi.mock('@/config/supabase');
vi.mock('jsonwebtoken', () => ({
    default: {
        verify: vi.fn(),
    },
    verify: vi.fn(),
}));

describe('Ingredients API Integration Tests', () => {
    let authToken = 'mock-jwt-token';
    const mockIngredient = {
        id: 'ing-123',
        name: 'Test Ingredient',
        sku: 'SKU-123',
        unit: 'kg',
        cost: 10.50
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';

        // Mock both named and default export just in case
        (jwt.verify as any).mockReturnValue({
            userId: 'user-123',
            email: 'test@example.com'
        });
    });

    const createChain = (data: any, error: any = null) => {
        const chain: any = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            filter: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
            then: (resolve: any) => resolve({ data, count: Array.isArray(data) ? data.length : 0, error })
        };
        return chain;
    };

    it('should list ingredients', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain([mockIngredient]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/ingredients')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data[0]).toMatchObject(mockIngredient);
    });

    it('should apply search and filters when listing ingredients', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain([mockIngredient]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/ingredients?search=Tom&family_id=fam-1&supplier_id=supp-1')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
    });

    it('should create a new ingredient', async () => {
        const newIngredient = {
            name: `Test Ingredient ${Date.now()}`,
            unit_id: '123e4567-e89b-12d3-a456-426614174000',
            cost_price: 10.50
        };

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain({ ...newIngredient, id: 'ing-new' });
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients')
            .set('Authorization', `Bearer ${authToken}`)
            .send(newIngredient);

        expect([200, 201]).toContain(res.status);
        expect(res.body.data.name).toBe(newIngredient.name);
    });

    it('should get the created ingredient by ID', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain(mockIngredient);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get(`/api/v1/ingredients/${mockIngredient.id}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(mockIngredient.id);
    });

    it('should update the ingredient', async () => {
        const updatedData = { cost_price: 12.00 };

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain({ ...mockIngredient, ...updatedData });
            }
            return createChain([]);
        });

        const res = await request(app)
            .patch(`/api/v1/ingredients/${mockIngredient.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedData);

        expect(res.status).toBe(200);
        expect(res.body.data.cost_price).toBe(12.00);
    });

    it('should return 500 when getById throws', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                throw new Error('DB');
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/ingredients/ing-err')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });
    it('should return 404 when updating missing ingredient', async () => {
        const updatedData = { cost_price: 12.0 };

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain(null);
            }
            return createChain([]);
        });

        const res = await request(app)
            .patch('/api/v1/ingredients/ing-missing')
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedData);

        expect(res.status).toBe(404);
    });

    it('should delete the ingredient', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain(mockIngredient);
            }
            return createChain([]);
        });

        const res = await request(app)
            .delete(`/api/v1/ingredients/${mockIngredient.id}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect([200, 204]).toContain(res.status);
    });

    it('should return 404 when ingredient not found', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain(null);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/ingredients/ing-missing')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(404);
    });

    it('should return 409 when ingredient already exists', async () => {
        const newIngredient = {
            name: 'Dup Ingredient',
            unit_id: '123e4567-e89b-12d3-a456-426614174000',
            cost_price: 10.5
        };

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                const chain = createChain(null);
                chain.single = vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: '23505' }
                });
                return chain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients')
            .set('Authorization', `Bearer ${authToken}`)
            .send(newIngredient);

        expect(res.status).toBe(409);
    });

    it('should return 500 when creating ingredient fails', async () => {
        const newIngredient = {
            name: 'Broken Ingredient',
            unit_id: '123e4567-e89b-12d3-a456-426614174000',
            cost_price: 10.5
        };

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                const chain = createChain(null, new Error('DB'));
                chain.single = vi.fn().mockResolvedValue({ data: null, error: new Error('DB') });
                return chain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients')
            .set('Authorization', `Bearer ${authToken}`)
            .send(newIngredient);

        expect(res.status).toBe(500);
    });
    it('should list low stock ingredients', async () => {
        const lowStock = [{ id: 'ing-low', stock_current: 1, stock_min: 5 }];
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain(lowStock);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/ingredients/low-stock')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(1);
    });

    it('should return zero total when low stock list is empty', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        const emptyChain = createChain(null);
        emptyChain.then = (resolve: any) => resolve({ data: null, count: null, error: null });
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return emptyChain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/ingredients/low-stock')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(0);
    });
    it('should analyze CSV file', async () => {
        vi.spyOn(CSVImporterService.prototype, 'analyzeCSV').mockResolvedValue({
            total_rows: 1,
            unknown_suppliers: [],
            preview: []
        });

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients/import/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('file', Buffer.from('Nombre Artículo,Proveedor,Precio,Unidad\nA,B,1,kg'), 'items.csv');

        expect(res.status).toBe(200);
        expect(res.body.total_rows).toBe(1);
    });

    it('should reject non-csv file upload', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients/import/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('file', Buffer.from('x'), 'items.txt');

        expect([400, 500]).toContain(res.status);
    });
    it('should return 400 when analyzing CSV without file', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients/import/analyze')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(400);
    });

    it('should return 500 when CSV analysis fails', async () => {
        vi.spyOn(CSVImporterService.prototype, 'analyzeCSV').mockRejectedValue(new Error('boom'));

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients/import/analyze')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('file', Buffer.from('Nombre Artículo,Proveedor,Precio,Unidad\nA,B,1,kg'), 'items.csv');

        expect(res.status).toBe(500);
    });

    it('should import CSV file with resolutions', async () => {
        vi.spyOn(CSVImporterService.prototype, 'executeImport').mockResolvedValue({
            imported: 1,
            updated: 0,
            created_suppliers: 0,
            errors: []
        });

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients/import/execute')
            .set('Authorization', `Bearer ${authToken}`)
            .field('resolutions', JSON.stringify([]))
            .attach('file', Buffer.from('Nombre Artículo,Proveedor,Precio,Unidad\nA,B,1,kg'), 'items.csv');

        expect(res.status).toBe(200);
        expect(res.body.imported).toBe(1);
    });

    it('should import CSV file without resolutions', async () => {
        vi.spyOn(CSVImporterService.prototype, 'executeImport').mockResolvedValue({
            imported: 1,
            updated: 0,
            created_suppliers: 0,
            errors: []
        });

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients/import/execute')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('file', Buffer.from('Nombre Artículo,Proveedor,Precio,Unidad\nA,B,1,kg'), 'items.csv');

        expect(res.status).toBe(200);
        expect(res.body.imported).toBe(1);
    });
    it('should return 400 when importing CSV without file', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients/import/execute')
            .set('Authorization', `Bearer ${authToken}`)
            .field('resolutions', JSON.stringify([]));

        expect(res.status).toBe(400);
    });

    it('should return empty list when no ingredients', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        const emptyChain = createChain(null);
        emptyChain.then = (resolve: any) => resolve({ data: null, count: null, error: null });
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return emptyChain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/ingredients')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toBeNull();
    });

    it('should return 500 when listing ingredients fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        const errorChain = createChain(null);
        errorChain.then = (resolve: any) => resolve({ data: null, count: null, error: new Error('DB') });
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return errorChain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/ingredients')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });

    it('should create ingredient with explicit stock values', async () => {
        const newIngredient = {
            name: `Test Ingredient ${Date.now()}`,
            unit_id: '123e4567-e89b-12d3-a456-426614174000',
            cost_price: 10.5,
            stock_current: 5,
            stock_min: 2
        };

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain({ ...newIngredient, id: 'ing-new' });
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients')
            .set('Authorization', `Bearer ${authToken}`)
            .send(newIngredient);

        expect([200, 201]).toContain(res.status);
    });

    it('should return 500 when updating ingredient fails', async () => {
        const updatedData = { cost_price: 12.0 };
        const fromSpy = vi.spyOn(supabase, 'from');
        let calls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                calls += 1;
                if (calls === 1) return createChain({ id: 'ing-1' });
                const chain = createChain(null, new Error('DB'));
                chain.single = vi.fn().mockResolvedValue({ data: null, error: new Error('DB') });
                return chain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .patch('/api/v1/ingredients/ing-1')
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedData);

        expect(res.status).toBe(500);
    });

    it('should return 500 when deleting ingredient fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain(null, new Error('DB'));
            }
            return createChain([]);
        });

        const res = await request(app)
            .delete('/api/v1/ingredients/ing-1')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });

    it('should return 500 when low stock query fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        const errorChain = createChain(null);
        errorChain.then = (resolve: any) => resolve({ data: null, count: null, error: new Error('DB') });
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return errorChain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/ingredients/low-stock')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });

    it('should return 500 when CSV import fails', async () => {
        vi.spyOn(CSVImporterService.prototype, 'executeImport').mockRejectedValue(new Error('boom'));

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/ingredients/import/execute')
            .set('Authorization', `Bearer ${authToken}`)
            .field('resolutions', JSON.stringify([]))
            .attach('file', Buffer.from('Nombre Artículo,Proveedor,Precio,Unidad\\nA,B,1,kg'), 'items.csv');

        expect(res.status).toBe(500);
    });
});
