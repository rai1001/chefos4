import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// Mock auth middleware BEFORE importing app
vi.mock('@/middleware/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      organizationIds: ['test-org-id']
    };
    next();
  }
}));

// Mock Supabase to avoid real DB calls and setup errors
// We need to match the structure expected by services
const mockSupabase = vi.hoisted(() => ({
    from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

vi.mock('@/config/supabase', () => ({
    supabase: mockSupabase,
}));

// Mock logger to suppress errors in test output
vi.mock('@/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
    },
}));

import app from '../../src/index';

describe('Inventory Validation Integration', () => {
  describe('POST /inventory/stock-out', () => {
    it('should fail when quantity is negative', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/stock-out')
        .send({
          quantity: -5,
          movement_type: 'OUT'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details[0].message).toContain('positive');
    });

    it('should fail when movement_type is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/stock-out')
        .send({
          quantity: 10,
          movement_type: 'INVALID_TYPE'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should pass validation with correct data', async () => {
      // Mocking service/supabase response implicitly via the mock above
      // We expect 200 or 500 depending on how deep the service goes,
      // but NOT 400.
      const res = await request(app)
        .post('/api/v1/inventory/stock-out')
        .send({
            quantity: 10,
            movement_type: 'OUT',
            barcode: '123456'
        });

       // If it passes validation, it enters the controller.
       // The controller calls service, which calls Supabase.
       // Our Supabase mock returns data, so it should likely succeed or fail with 500 if logic breaks.
       // But we specifically check it's NOT 400.
       expect(res.status).not.toBe(400);
    });
  });

  describe('POST /inventory/locations', () => {
    it('should fail when name is missing', async () => {
        const res = await request(app)
            .post('/api/v1/inventory/locations')
            .send({
                type: 'storage'
            });
        expect(res.status).toBe(400);
    });

    it('should fail when name is too short', async () => {
        const res = await request(app)
            .post('/api/v1/inventory/locations')
            .send({
                name: 'a',
                type: 'storage'
            });
        expect(res.status).toBe(400);
    });
  });

  describe('POST /inventory/cycle-counts', () => {
      it('should fail when name is missing', async () => {
          const res = await request(app)
            .post('/api/v1/inventory/cycle-counts')
            .send({});
          expect(res.status).toBe(400);
      });
  });

  describe('PATCH /inventory/cycle-counts/:id/items', () => {
      it('should fail when items array is empty', async () => {
          const res = await request(app)
            .patch('/api/v1/inventory/cycle-counts/123/items')
            .send({ items: [] });
          expect(res.status).toBe(400);
      });

      it('should fail when item quantity is negative', async () => {
          const res = await request(app)
            .patch('/api/v1/inventory/cycle-counts/123/items')
            .send({
                items: [{
                    id: 'uuid-1234',
                    counted_qty: -1
                }]
            });
          expect(res.status).toBe(400);
      });
  });
});
