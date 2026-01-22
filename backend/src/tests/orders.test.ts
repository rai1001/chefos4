import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { supabase } from '@/config/supabase';
import jwt from 'jsonwebtoken';

vi.mock('@/config/supabase');
vi.mock('jsonwebtoken', () => ({
    default: {
        verify: vi.fn(),
    },
    verify: vi.fn(),
}));
vi.mock('@/services/purchase-order-generator.service', () => ({
    PurchaseOrderGeneratorService: vi.fn().mockImplementation(() => ({
        checkStockAvailability: vi.fn().mockResolvedValue({
            has_sufficient_stock: true,
            missing_ingredients: [],
        }),
        generateFromEvent: vi.fn().mockResolvedValue([]),
    })),
}));

describe('Orders API Integration Tests', () => {
    let authToken = 'mock-jwt-token';
    const mockOrder = {
        id: 'po-123',
        status: 'DRAFT',
        supplier_id: 'supp-123',
        event_id: 'evt-123',
        organization_id: 'org-123',
        order_date: new Date().toISOString()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';

        (jwt.verify as any).mockReturnValue({
            userId: 'user-123',
            email: 'test@example.com'
        });
    });

    const createChain = (data: any) => {
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
            single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error: null }),
            then: (resolve: any) => resolve({ data, count: Array.isArray(data) ? data.length : 0, error: null })
        };
        return chain;
    };

    it('should list purchase orders', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'purchase_orders') {
                return createChain([mockOrder]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .get('/api/v1/purchase-orders')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data[0]).toMatchObject({ id: mockOrder.id });
    });

    it('should generate orders (dry-run)', async () => {
        const eventId = 'evt-123';

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'organization_members') {
                return createChain([{ organization_id: 'org-123' }]);
            }
            if (table === 'events') {
                return createChain([{ id: eventId, name: 'Test Event' }]);
            }
            return createChain([]);
        });

        const res = await request(app)
            .post(`/api/v1/events/${eventId}/generate-purchase-orders`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                dryRun: true
            });

        expect(res.status).toBe(200);
        expect(res.body.event).toMatchObject({ id: eventId, name: 'Test Event' });
        expect(res.body).toMatchObject({
            stock_status: {
                has_sufficient_stock: true,
                missing_ingredients: [],
            },
            generated_purchase_orders: [],
            total_pos: 0,
        });
    });
});
