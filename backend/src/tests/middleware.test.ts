import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { errorMiddleware } from '@/middleware/error.middleware';
import { notFoundMiddleware } from '@/middleware/not-found.middleware';
import { validate } from '@/middleware/validation.middleware';
import { authMiddleware, AuthRequest } from '@/middleware/auth.middleware';
import { AppError } from '@/utils/errors';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');
vi.mock('@/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

const createRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Middleware', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    it('errorMiddleware handles AppError with stack in development', () => {
        process.env.NODE_ENV = 'development';
        const err = new AppError(400, 'Bad request');
        const req: any = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
        const res = createRes();
        const next = vi.fn();

        errorMiddleware(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: 'Bad request',
                stack: expect.any(String),
            })
        );
    });

    it('errorMiddleware handles unexpected error without debug info in production', () => {
        process.env.NODE_ENV = 'production';
        const err = new Error('Boom');
        const req: any = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
        const res = createRes();
        const next = vi.fn();

        errorMiddleware(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('notFoundMiddleware returns 404 with route info', () => {
        const req: any = { originalUrl: '/missing' };
        const res = createRes();

        notFoundMiddleware(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Not Found',
            message: 'Route /missing not found',
        });
    });

    it('validate passes when schema is valid', async () => {
        const schema = z.object({
            body: z.object({ name: z.string() }),
            query: z.object({}).optional(),
            params: z.object({}).optional(),
        });
        const middleware = validate(schema);
        const req: any = { body: { name: 'Chef' }, query: {}, params: {} };
        const res = createRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('validate returns 400 with zod details on validation error', async () => {
        const schema = z.object({
            body: z.object({ name: z.string().min(2) }),
            query: z.object({}).optional(),
            params: z.object({}).optional(),
        });
        const middleware = validate(schema);
        const req: any = { body: { name: '' }, query: {}, params: {} };
        const res = createRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: 'Validation failed',
                details: expect.any(Array),
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('validate returns 500 on unexpected errors', async () => {
        const schema: any = {
            parseAsync: vi.fn().mockRejectedValue(new Error('Unexpected')),
        };
        const middleware = validate(schema);
        const req: any = { body: {}, query: {}, params: {} };
        const res = createRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('authMiddleware rejects missing token', async () => {
        const req = { headers: {} } as AuthRequest;
        const res = createRes();
        const next = vi.fn();

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
        expect(next).not.toHaveBeenCalled();
    });

    it('authMiddleware rejects invalid token', async () => {
        const req = { headers: { authorization: 'Bearer bad' } } as AuthRequest;
        const res = createRes();
        const next = vi.fn();
        vi.spyOn(jwt, 'verify').mockImplementation(() => {
            throw new jwt.JsonWebTokenError('Invalid');
        });

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });

    it('authMiddleware returns 500 when supabase errors', async () => {
        const req = { headers: { authorization: 'Bearer ok' } } as AuthRequest;
        const res = createRes();
        const next = vi.fn();
        vi.spyOn(jwt, 'verify').mockReturnValue({ userId: 'user-1', email: 'a@b.com' } as any);

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: null, error: new Error('DB') }),
        } as any);

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
        expect(next).not.toHaveBeenCalled();
    });

    it('authMiddleware returns 500 when table does not exist (PGRST205)', async () => {
        const req = { headers: { authorization: 'Bearer ok' } } as AuthRequest;
        const res = createRes();
        const next = vi.fn();
        vi.spyOn(jwt, 'verify').mockReturnValue({ userId: 'user-1', email: 'a@b.com' } as any);

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: null, error: { code: 'PGRST205', message: 'relation does not exist' } }),
        } as any);

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
        expect(next).not.toHaveBeenCalled();
    });

    it('authMiddleware sets user and calls next on success', async () => {
        const req = { headers: { authorization: 'Bearer ok' } } as AuthRequest;
        const res = createRes();
        const next = vi.fn();
        vi.spyOn(jwt, 'verify').mockReturnValue({ userId: 'user-1', email: 'a@b.com' } as any);

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [{ organization_id: 'org-1' }], error: null }),
        } as any);

        await authMiddleware(req, res, next);

        expect(req.user).toEqual({
            id: 'user-1',
            email: 'a@b.com',
            organizationIds: ['org-1'],
        });
        expect(next).toHaveBeenCalled();
    });
});
