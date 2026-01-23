import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Set environment variables for tests
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'example-key';
process.env.JWT_SECRET = 'test-secret';

// Mock Supabase client
const mockSupabase = {
    auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
    },
    from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
};

vi.mock('@/config/supabase', () => ({
    supabase: mockSupabase,
}));

vi.mock('@/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

beforeAll(async () => {
    // Global setup
});

afterEach(async () => {
    vi.clearAllMocks();
});

afterAll(async () => {
    // Global teardown
});

export { mockSupabase };
