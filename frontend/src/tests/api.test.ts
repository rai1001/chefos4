import { describe, it, expect, vi, beforeEach } from 'vitest';

const requestUse = vi.hoisted(() => vi.fn());
const responseUse = vi.hoisted(() => vi.fn());
const axiosInstance = vi.hoisted(() => ({
    interceptors: {
        request: { use: requestUse },
        response: { use: responseUse },
    },
}));

vi.mock('axios', () => ({
    default: { create: vi.fn(() => axiosInstance) },
    create: vi.fn(() => axiosInstance),
}));

const logoutMock = vi.hoisted(() => vi.fn());
const getStateMock = vi.hoisted(() => vi.fn(() => ({ token: 'token-123', logout: logoutMock })));

vi.mock('@/stores/authStore', () => ({
    useAuthStore: { getState: getStateMock },
}));

vi.mock('@/config/constants', () => ({
    APP_CONFIG: { apiUrl: 'http://api.test' },
}));

async function loadApi() {
    vi.resetModules();
    const mod = await import('../services/api');
    return mod.api;
}

describe('api service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { href: '' },
        });
    });

    it('adds auth token in request interceptor', async () => {
        const api = await loadApi();
        expect(api).toBeDefined();
        const handler = requestUse.mock.calls[0][0];
        const config = { headers: {} as Record<string, string> };
        const result = handler(config);
        expect(result.headers.Authorization).toBe('Bearer token-123');
    });

    it('logs out on 401 for non-auth endpoints', async () => {
        const api = await loadApi();
        expect(api).toBeDefined();
        const errorHandler = responseUse.mock.calls[0][1];
        await expect(errorHandler({ response: { status: 401 }, config: { url: '/events' } })).rejects.toBeDefined();
        expect(logoutMock).toHaveBeenCalled();
        expect(window.location.href).toBe('/login');
    });

    it('does not logout on auth endpoints', async () => {
        const api = await loadApi();
        expect(api).toBeDefined();
        const errorHandler = responseUse.mock.calls[0][1];
        await expect(errorHandler({ response: { status: 401 }, config: { url: '/auth/login' } })).rejects.toBeDefined();
        expect(logoutMock).not.toHaveBeenCalled();
    });
});
