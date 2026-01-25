import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index';

// Mock Supabase to avoid connection errors
vi.mock('@/config/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
    },
}));

describe('Auth Rate Limit', () => {
    it('should enforce rate limits on login endpoint', async () => {
        // Make 10 allowed requests
        for (let i = 0; i < 10; i++) {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                });

            // Should not be 429 yet
            // It will likely be 401 (invalid creds) or 500 (mocking issues), but not blocked
            expect(res.status).not.toBe(429);
        }

        // Make the 11th request, which should be blocked
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123',
            });

        expect(res.status).toBe(429);
        expect(res.text).toContain('Too many login attempts');
    });

    it('should enforce rate limits on register endpoint', async () => {
         // Since rate limit is per IP, and we already exhausted it in previous test (if they share the same store/IP),
         // this test might fail immediately with 429.
         // express-rate-limit uses memory store by default.
         // Tests run in same process.
         // So likely the limit is already reached for this IP.

         const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: 'new@example.com',
                password: 'password123',
                name: 'Test',
                organizationName: 'Org'
            });

        expect(res.status).toBe(429);
    });
});
