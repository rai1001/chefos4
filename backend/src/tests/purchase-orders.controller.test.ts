import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { supabase } from '@/config/supabase';
import { DeliveryEstimatorService } from '@/services/delivery-estimator.service';
import { createSupabaseChain } from './helpers/supabase';
import jwt from 'jsonwebtoken';

vi.mock('@/config/supabase');
vi.mock('@/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));
vi.mock('jsonwebtoken', () => ({
    default: {
        verify: vi.fn(),
    },
    verify: vi.fn(),
}));

describe('Purchase Orders API Integration Tests', () => {
    const authToken = 'mock-jwt-token';

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';

        (jwt.verify as any).mockReturnValue({
            userId: 'user-123',
            email: 'test@example.com',
        });
    });

    it('should list purchase orders', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain([{ id: 'po-1', status: 'DRAFT' }], null, 1);
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .get('/api/v1/purchase-orders')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.pagination.total).toBe(1);
        expect(res.body.data[0].id).toBe('po-1');
    });

    it('should return 500 when listing purchase orders fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain(null, new Error('DB'));
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .get('/api/v1/purchase-orders')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });

    it('should list purchase orders with filters', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain([{ id: 'po-1', status: 'SENT', supplier_id: 's1', event_id: 'e1' }], null, 1);
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .get('/api/v1/purchase-orders?status=SENT&supplier_id=s1&event_id=e1')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data[0].status).toBe('SENT');
    });

    it('should return 404 when purchase order not found', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain(null, null);
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .get('/api/v1/purchase-orders/po-404')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(404);
    });

    it('should get purchase order details with items', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain({ id: 'po-1', status: 'DRAFT' });
            }
            if (table === 'purchase_order_items') {
                return createSupabaseChain([{ id: 'item-1', quantity_ordered: 2 }]);
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .get('/api/v1/purchase-orders/po-1')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(1);
    });

    it('should return 500 when items fetch fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain({ id: 'po-1', status: 'DRAFT' });
            }
            if (table === 'purchase_order_items') {
                return createSupabaseChain(null, new Error('DB'));
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .get('/api/v1/purchase-orders/po-1')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });

    it('should create a purchase order with items', async () => {
        vi.spyOn(DeliveryEstimatorService.prototype, 'estimateDeliveryDate').mockResolvedValue(
            new Date('2026-01-25T00:00:00.000Z')
        );

        let poCalls = 0;
        let itemCalls = 0;
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ id: 'po-1' });
                return createSupabaseChain({ id: 'po-1', total_cost: 10 });
            }
            if (table === 'purchase_order_items') {
                itemCalls += 1;
                if (itemCalls === 1) return createSupabaseChain([]);
                return createSupabaseChain([{ total_price: 10 }]);
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .post('/api/v1/purchase-orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                supplier_id: 'supp-1',
                event_id: 'event-1',
                items: [
                    {
                        ingredient_id: 'ing-1',
                        quantity_ordered: 2,
                        unit_id: 'u-1',
                        unit_price: 5,
                    },
                ],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.id).toBe('po-1');
    });

    it('should create a purchase order without items', async () => {
        vi.spyOn(DeliveryEstimatorService.prototype, 'estimateDeliveryDate').mockResolvedValue(
            new Date('2026-01-25T00:00:00.000Z')
        );

        let poCalls = 0;
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ id: 'po-2' });
                return createSupabaseChain({ id: 'po-2', total_cost: 0 });
            }
            if (table === 'purchase_order_items') {
                return createSupabaseChain([]);
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .post('/api/v1/purchase-orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                supplier_id: 'supp-1',
                event_id: 'event-1',
                items: [],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.id).toBe('po-2');
    });

    it('should return 500 when create fails', async () => {
        vi.spyOn(DeliveryEstimatorService.prototype, 'estimateDeliveryDate').mockResolvedValue(
            new Date('2026-01-25T00:00:00.000Z')
        );

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain(null, new Error('DB'));
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .post('/api/v1/purchase-orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                supplier_id: 'supp-1',
                event_id: 'event-1',
                items: [],
            });

        expect(res.status).toBe(500);
    });

    it('should return 500 when item insert fails', async () => {
        vi.spyOn(DeliveryEstimatorService.prototype, 'estimateDeliveryDate').mockResolvedValue(
            new Date('2026-01-25T00:00:00.000Z')
        );

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain({ id: 'po-1' });
            }
            if (table === 'purchase_order_items') {
                return createSupabaseChain(null, new Error('Insert failed'));
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .post('/api/v1/purchase-orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                supplier_id: 'supp-1',
                event_id: 'event-1',
                items: [{ ingredient_id: 'ing-1', quantity_ordered: 2, unit_id: 'u-1' }],
            });

        expect(res.status).toBe(500);
    });

    it('should update purchase order status', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let poCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ id: 'po-1' });
                return createSupabaseChain({ id: 'po-1', status: 'SENT' });
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .patch('/api/v1/purchase-orders/po-1/status')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ status: 'SENT' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('SENT');
    });

    it('should return 404 when updating status for missing PO', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain(null);
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .patch('/api/v1/purchase-orders/po-missing/status')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ status: 'SENT' });

        expect(res.status).toBe(404);
    });

    it('should return 500 when status update fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let poCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ id: 'po-1' });
                return createSupabaseChain(null, new Error('DB'));
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .patch('/api/v1/purchase-orders/po-1/status')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ status: 'SENT' });

        expect(res.status).toBe(500);
    });

    it('should reject receiving items when status is not SENT', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain({ id: 'po-1', status: 'DRAFT' });
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .post('/api/v1/purchase-orders/po-1/receive')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ items: [] });

        expect(res.status).toBe(400);
    });

    it('should return 404 when receiving items for missing PO', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain(null);
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .post('/api/v1/purchase-orders/po-missing/receive')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ items: [] });

        expect(res.status).toBe(404);
    });

    it('should receive items and update PO status', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let poCalls = 0;
        let itemCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ id: 'po-1', status: 'SENT' });
                return createSupabaseChain({ id: 'po-1', status: 'RECEIVED' });
            }
            if (table === 'purchase_order_items') {
                itemCalls += 1;
                if (itemCalls === 1) return createSupabaseChain([]);
                return createSupabaseChain({ ingredient_id: 'ing-1' });
            }
            return createSupabaseChain([]);
        });
        (supabase as any).rpc = vi.fn().mockResolvedValue({ data: null, error: null });

        const res = await request(app)
            .post('/api/v1/purchase-orders/po-1/receive')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                items: [
                    { id: 'item-1', quantity_received: 2, quantity_ordered: 2 },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('RECEIVED');
    });

    it('should set status PARTIAL when not all items received', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let poCalls = 0;
        let itemCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ id: 'po-1', status: 'SENT' });
                return createSupabaseChain({ id: 'po-1', status: 'PARTIAL' });
            }
            if (table === 'purchase_order_items') {
                itemCalls += 1;
                if (itemCalls === 1) return createSupabaseChain([]);
                return createSupabaseChain({ ingredient_id: 'ing-1' });
            }
            return createSupabaseChain([]);
        });
        (supabase as any).rpc = vi.fn().mockResolvedValue({ data: null, error: null });

        const res = await request(app)
            .post('/api/v1/purchase-orders/po-1/receive')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                items: [
                    { id: 'item-1', quantity_received: 1, quantity_ordered: 2 },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('PARTIAL');
    });

    it('should return 500 when receive items update fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let poCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ id: 'po-1', status: 'SENT' });
                return createSupabaseChain({ id: 'po-1', status: 'RECEIVED' });
            }
            if (table === 'purchase_order_items') {
                return createSupabaseChain(null, new Error('DB'));
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .post('/api/v1/purchase-orders/po-1/receive')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                items: [
                    { id: 'item-1', quantity_received: 2, quantity_ordered: 2 },
                ],
            });

        expect(res.status).toBe(500);
    });

    it('should return 500 when PO update fails during receive', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let poCalls = 0;
        let itemCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ id: 'po-1', status: 'SENT' });
                return createSupabaseChain(null, new Error('DB'));
            }
            if (table === 'purchase_order_items') {
                itemCalls += 1;
                if (itemCalls === 1) return createSupabaseChain([]);
                return createSupabaseChain({ ingredient_id: 'ing-1' });
            }
            return createSupabaseChain([]);
        });
        (supabase as any).rpc = vi.fn().mockResolvedValue({ data: null, error: null });

        const res = await request(app)
            .post('/api/v1/purchase-orders/po-1/receive')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                items: [
                    { id: 'item-1', quantity_received: 2, quantity_ordered: 2 },
                ],
            });

        expect(res.status).toBe(500);
    });

    it('should delete draft purchase order', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let poCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ status: 'DRAFT' });
                return createSupabaseChain({ id: 'po-1' });
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .delete('/api/v1/purchase-orders/po-1')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Purchase order deleted successfully');
    });

    it('should return 404 when deleting missing PO', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createSupabaseChain(null);
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .delete('/api/v1/purchase-orders/po-missing')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(404);
    });

    it('should return 400 when deleting non-draft PO', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let poCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ status: 'SENT' });
                return createSupabaseChain({ id: 'po-1' });
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .delete('/api/v1/purchase-orders/po-1')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(400);
    });

    it('should return 500 when delete fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let poCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createSupabaseChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                poCalls += 1;
                if (poCalls === 1) return createSupabaseChain({ status: 'DRAFT' });
                return createSupabaseChain(null, new Error('DB'));
            }
            return createSupabaseChain([]);
        });

        const res = await request(app)
            .delete('/api/v1/purchase-orders/po-1')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(500);
    });
});
