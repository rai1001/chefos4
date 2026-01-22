import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Config and index bootstrap', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('initializes supabase client with env vars', async () => {
        process.env.SUPABASE_URL = 'http://supabase.test';
        process.env.SUPABASE_SERVICE_KEY = 'service-key';

        const mod = await import('@/config/supabase');
        expect(mod.supabase).toBeDefined();
    });

    it('initializes supabase client with empty defaults when env missing', async () => {
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_SERVICE_KEY;

        const mod = await import('@/config/supabase');
        expect(mod.supabase).toBeDefined();
    });

    it('boots express app without listening when NODE_ENV is test', async () => {
        process.env.NODE_ENV = 'test';
        process.env.API_VERSION = 'v9';
        process.env.CORS_ORIGIN = 'http://example.test';
        process.env.PORT = '4000';

        const app = { use: vi.fn(), get: vi.fn(), listen: vi.fn() };
        const router = {
            use: vi.fn(),
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            patch: vi.fn(),
            delete: vi.fn(),
        };
        const express = Object.assign(() => app, {
            json: () => (req: any, res: any, next: any) => next(),
            urlencoded: () => (req: any, res: any, next: any) => next(),
            Router: () => router,
        });

        vi.doMock('express', () => ({ default: express, Router: express.Router }));
        vi.doMock('helmet', () => ({ default: () => (req: any, res: any, next: any) => next() }));
        vi.doMock('cors', () => ({ default: () => (req: any, res: any, next: any) => next() }));
        vi.doMock('dotenv', () => ({ default: { config: vi.fn() } }));
        const mod = await import('@/index');
        expect(mod.default).toBe(app);
        expect(app.listen).not.toHaveBeenCalled();
    });

    it('boots express app and listens when NODE_ENV is not test', async () => {
        process.env.NODE_ENV = 'production';
        process.env.API_VERSION = 'v2';
        process.env.CORS_ORIGIN = 'http://example.test';
        process.env.PORT = '4001';

        const app = { use: vi.fn(), get: vi.fn(), listen: vi.fn() };
        const router = {
            use: vi.fn(),
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            patch: vi.fn(),
            delete: vi.fn(),
        };
        const express = Object.assign(() => app, {
            json: () => (req: any, res: any, next: any) => next(),
            urlencoded: () => (req: any, res: any, next: any) => next(),
            Router: () => router,
        });

        vi.doMock('express', () => ({ default: express, Router: express.Router }));
        vi.doMock('helmet', () => ({ default: () => (req: any, res: any, next: any) => next() }));
        vi.doMock('cors', () => ({ default: () => (req: any, res: any, next: any) => next() }));
        vi.doMock('dotenv', () => ({ default: { config: vi.fn() } }));
        await import('@/index');
        expect(app.listen).toHaveBeenCalledWith('4001', expect.any(Function));
    });
});
