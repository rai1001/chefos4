import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { supabase } from '@/config/supabase';
import jwt from 'jsonwebtoken';
import { DeliveryEstimatorService } from '@/services/delivery-estimator.service';

vi.mock('@/config/supabase');
vi.mock('jsonwebtoken', () => ({
    default: {
        verify: vi.fn(),
    },
    verify: vi.fn(),
}));

describe('Suppliers API Integration Tests', () => {
    let authToken = 'mock-jwt-token';
    const mockSupplier = {
        id: 'supp-123',
        name: 'Test Supplier',
        contact_email: 'contact@supplier.com',
        contact_phone: '123456789'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';

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
            not: vi.fn().mockReturnThis(),
            filter: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
            then: (resolve: any) => resolve({ data, count: Array.isArray(data) ? data.length : 0, error })
        };
        return chain;
    };

    it('should list suppliers', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return createChain([mockSupplier]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data[0]).toMatchObject(mockSupplier);
    });

    it('should search suppliers', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return createChain([mockSupplier]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers?search=Test')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
    });

    it('should create a new supplier', async () => {
        const newSupplier = {
            name: `Test Supplier ${Date.now()}`,
            contact_email: 'contact@supplier.com',
            contact_phone: '123456789'
        };

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return createChain({ ...newSupplier, id: 'supp-new' });
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/suppliers')
            .set('Authorization', `Bearer ${authToken}`)
            .send(newSupplier);

        expect([200, 201]).toContain(res.status);
        expect(res.body.data.name).toBe(newSupplier.name);
    });

    it('should update the supplier', async () => {
        const updatedData = { contact_email: 'updated@supplier.com' };

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return createChain({ ...mockSupplier, ...updatedData });
            }
            return createChain([]);
        });

        const res = await request(app)
            .patch(`/api/v1/suppliers/${mockSupplier.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedData);

        expect(res.status).toBe(200);
        expect(res.body.data.contact_email).toBe(updatedData.contact_email);
    });

    it('should return 404 when updating missing supplier', async () => {
        const updatedData = { contact_email: 'updated@supplier.com' };

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return createChain(null);
            }
            return createChain([]);
        });

        const res = await request(app)
            .patch('/api/v1/suppliers/supp-missing')
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedData);

        expect(res.status).toBe(404);
    });

    it('should delete the supplier', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return createChain(mockSupplier);
            }
            return createChain([]);
        });

        const res = await request(app)
            .delete(`/api/v1/suppliers/${mockSupplier.id}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect([200, 204]).toContain(res.status);
    });

    it('should return 404 when supplier not found', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return createChain(null);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers/supp-missing')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(404);
    });

    it('should reject create when delivery days empty', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/suppliers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: 'Supp', delivery_days: [] });

        expect(res.status).toBe(400);
    });

    it('should return 409 when supplier already exists', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                const chain = createChain(null);
                chain.single = vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: '23505' },
                });
                return chain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/suppliers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: 'Duplicate Supplier' });

        expect(res.status).toBe(409);
    });

    it('should prevent delete when supplier has ingredients', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain([{ id: 'ing-1' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .delete('/api/v1/suppliers/supp-1')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(400);
    });

    it('should estimate delivery date', async () => {
        vi.spyOn(DeliveryEstimatorService.prototype, 'estimateDeliveryDate').mockResolvedValue(
            new Date('2026-01-26T00:00:00.000Z')
        );
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers/supp-1/estimate-delivery')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.supplier_id).toBe('supp-1');
    });

    it('should return 500 when estimate delivery fails', async () => {
        vi.spyOn(DeliveryEstimatorService.prototype, 'estimateDeliveryDate').mockRejectedValue(
            new Error('fail')
        );

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers/supp-1/estimate-delivery')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });

    it('should return suppliers with cutoff status', async () => {
        vi.spyOn(DeliveryEstimatorService.prototype, 'calculateTimeUntilCutoff').mockReturnValue(60);
        vi.spyOn(DeliveryEstimatorService.prototype, 'isDeliveryDayToday').mockReturnValue(true);

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return createChain([
                    { id: 'supp-1', cut_off_time: '12:00:00', delivery_days: [1, 2, 3, 4, 5] },
                ]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers/cutoff-status/all')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data[0].cutoff_status).toMatchObject({
            minutes_until_cutoff: 60,
            is_delivery_day: true,
        });
    });

    it('should return empty list when no suppliers', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        const emptyChain = createChain(null);
        emptyChain.then = (resolve: any) => resolve({ data: null, count: null, error: null });
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return emptyChain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.total).toBe(0);
    });

    it('should return 500 when listing suppliers fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        const errorChain = createChain(null);
        errorChain.then = (resolve: any) => resolve({ data: null, count: null, error: new Error('DB') });
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return errorChain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });

    it('should create supplier with custom delivery settings', async () => {
        const newSupplier = {
            name: `Test Supplier ${Date.now()}`,
            lead_time_days: 5,
            delivery_days: [1, 3, 5]
        };

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return createChain({ ...newSupplier, id: 'supp-new' });
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/suppliers')
            .set('Authorization', `Bearer ${authToken}`)
            .send(newSupplier);

        expect([200, 201]).toContain(res.status);
    });

    it('should return 500 when supplier creation fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                const chain = createChain(null);
                chain.single = vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('DB')
                });
                return chain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .post('/api/v1/suppliers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: 'Supplier' });

        expect(res.status).toBe(500);
    });

    it('should return 500 when updating supplier fails', async () => {
        const updatedData = { contact_email: 'updated@supplier.com' };

        const fromSpy = vi.spyOn(supabase, 'from');
        let calls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                calls += 1;
                if (calls === 1) return createChain({ id: 'supp-1' });
                return createChain(null, new Error('DB'));
            }
            return createChain([]);
        });

        const res = await request(app)
            .patch('/api/v1/suppliers/supp-1')
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedData);

        expect(res.status).toBe(500);
    });

    it('should return 500 when delete fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'ingredients') {
                return createChain([]);
            }
            if (table === 'suppliers') {
                return createChain(null, new Error('DB'));
            }
            return createChain([]);
        });

        const res = await request(app)
            .delete('/api/v1/suppliers/supp-1')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });

    it('should estimate delivery date using order_date param', async () => {
        vi.spyOn(DeliveryEstimatorService.prototype, 'estimateDeliveryDate').mockResolvedValue(
            new Date('2026-01-26T00:00:00.000Z')
        );
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers/supp-1/estimate-delivery?order_date=2026-01-22T10:00:00Z')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.order_date).toContain('2026-01-22');
    });

    it('should handle cutoff status when delivery days missing', async () => {
        vi.spyOn(DeliveryEstimatorService.prototype, 'calculateTimeUntilCutoff').mockReturnValue(-10);
        vi.spyOn(DeliveryEstimatorService.prototype, 'isDeliveryDayToday').mockReturnValue(false);

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return createChain([
                    { id: 'supp-1', cut_off_time: '12:00:00', delivery_days: null },
                ]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers/cutoff-status/all')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data[0].cutoff_status.has_passed).toBe(true);
    });

    it('should return 500 when cutoff status query fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        const errorChain = createChain(null);
        errorChain.then = (resolve: any) => resolve({ data: null, count: null, error: new Error('DB') });
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'suppliers') {
                return errorChain;
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/suppliers/cutoff-status/all')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });
});
