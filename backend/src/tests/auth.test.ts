import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { supabase } from '@/config/supabase';
import bcrypt from 'bcrypt';

vi.mock('@/config/supabase'); // Ensure it uses the mock from setup.ts

describe('Auth API Integration Tests', () => {
    let testUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'Test Org'
    };
    let authToken = '';

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
    });

    it('should register a new user', async () => {
        const mockUser = {
            id: 'user-123',
            email: testUser.email,
            name: `${testUser.firstName} ${testUser.lastName}`,
            password_hash: 'hashed_password' // Controller matches hash, we don't check it here in register
        };

        // Mock 'organizations' creation
        const mockOrg = {
            id: 'org-123',
            name: testUser.organizationName,
            plan: 'FREE'
        };

        // Chain mocking for Supabase
        // We need to carefully mock the chain of calls: from -> select -> eq -> single, etc.
        // utilizing the mock factory in setup.ts which returns 'this' for chainable methods.

        // Implementation note: The mock in setup.ts returns default resolved values.
        // We need to override specific implementations for this test.

        // Setup specific mocks for this flow
        // The controller calls:
        // 1. users.select('id').eq().single()
        // 2. users.insert().select().single()
        // 3. organizations.insert().select().single()
        // 4. organization_members.insert()

        // Since the mock utilizes shared generic mocks, we can spy on them or implement them.
        // However, differentiating between 'users' and 'organizations' calls on the same 'supabase' object is tricky with the simple mock in setup.ts 
        // because `supabase.from` is a jest.fn().

        // Better approach: mock `supabase.from` implementation to return different objects based on table name.

        // Shared mocks for 'users' table sequence
        const usersSingleMock = vi.fn()
            .mockResolvedValueOnce({ data: null, error: null }) // 1. Check existing
            .mockResolvedValueOnce({ data: mockUser, error: null }); // 2. Insert return

        // Shared mock for 'organizations' table
        const orgsSingleMock = vi.fn()
            .mockResolvedValue({ data: mockOrg, error: null });

        const fromSpy = vi.spyOn(supabase, 'from');

        fromSpy.mockImplementation((table: string) => {
            const chain = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                single: vi.fn(), // Default
                maybeSingle: vi.fn(),
            };

            if (table === 'users') {
                chain.single = usersSingleMock;
            }

            if (table === 'organizations') {
                chain.single = orgsSingleMock;
            }

            if (table === 'organization_members') {
                chain.insert.mockResolvedValue({ error: null });
            }

            return chain as any;
        });

        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: testUser.email,
                password: testUser.password,
                name: `${testUser.firstName} ${testUser.lastName}`,
                organizationName: testUser.organizationName
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.email).toBe(testUser.email);

        authToken = res.body.token;
    });

    it('should reject register when email already exists', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            const chain = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                single: vi.fn(),
                maybeSingle: vi.fn(),
            };

            if (table === 'users') {
                chain.single = vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null });
            }

            return chain as any;
        });

        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: testUser.email,
                password: testUser.password,
                name: `${testUser.firstName} ${testUser.lastName}`,
                organizationName: testUser.organizationName
            });

        expect(res.status).toBe(409);
    });

    it('should return 500 when organization creation fails', async () => {
        const mockUser = {
            id: 'user-123',
            email: testUser.email,
            name: `${testUser.firstName} ${testUser.lastName}`,
            password_hash: 'hashed_password'
        };

        const usersSingleMock = vi.fn()
            .mockResolvedValueOnce({ data: null, error: null })
            .mockResolvedValueOnce({ data: mockUser, error: null });

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            const chain = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                single: vi.fn(),
                maybeSingle: vi.fn(),
            };

            if (table === 'users') {
                chain.single = usersSingleMock;
            }

            if (table === 'organizations') {
                chain.single = vi.fn().mockResolvedValue({ data: null, error: new Error('Org fail') });
            }

            if (table === 'organization_members') {
                chain.insert = vi.fn().mockResolvedValue({ error: null });
            }

            return chain as any;
        });

        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: testUser.email,
                password: testUser.password,
                name: `${testUser.firstName} ${testUser.lastName}`,
                organizationName: testUser.organizationName
            });

        expect(res.status).toBe(500);
    });

    it('should return 500 when membership creation fails', async () => {
        const mockUser = {
            id: 'user-123',
            email: testUser.email,
            name: `${testUser.firstName} ${testUser.lastName}`,
            password_hash: 'hashed_password'
        };

        const mockOrg = {
            id: 'org-123',
            name: testUser.organizationName,
            plan: 'FREE'
        };

        const usersSingleMock = vi.fn()
            .mockResolvedValueOnce({ data: null, error: null })
            .mockResolvedValueOnce({ data: mockUser, error: null });

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            const chain = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                single: vi.fn(),
                maybeSingle: vi.fn(),
            };

            if (table === 'users') {
                chain.single = usersSingleMock;
            }

            if (table === 'organizations') {
                chain.single = vi.fn().mockResolvedValue({ data: mockOrg, error: null });
            }

            if (table === 'organization_members') {
                chain.insert = vi.fn().mockResolvedValue({ error: new Error('Member fail') });
            }

            return chain as any;
        });

        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: testUser.email,
                password: testUser.password,
                name: `${testUser.firstName} ${testUser.lastName}`,
                organizationName: testUser.organizationName
            });

        expect(res.status).toBe(500);
    });

    it('should login with the registered user', async () => {
        // Mock user retrieval
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        const mockUser = {
            id: 'user-123',
            email: testUser.email,
            name: 'Test User',
            password_hash: hashedPassword
        };

        const usersSingleMock = vi.fn().mockResolvedValue({ data: mockUser, error: null });

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            const chain = {
                select: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                single: vi.fn(),
            };

            if (table === 'users') {
                chain.single = usersSingleMock;
            }
            return chain as any;
        });

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        authToken = res.body.token;
    });

    it('should fail to login when user is not found', async () => {
        const usersSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            const chain = {
                select: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                single: vi.fn(),
            };
            if (table === 'users') {
                chain.single = usersSingleMock;
            }
            return chain as any;
        });

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.status).toBe(401);
    });

    it('should fail to login with invalid credentials', async () => {
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        const mockUser = {
            id: 'user-123',
            email: testUser.email,
            password_hash: hashedPassword
        };

        const usersSingleMock = vi.fn().mockResolvedValue({ data: mockUser, error: null });

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            const chain = {
                select: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                single: vi.fn(),
            };
            if (table === 'users') {
                chain.single = usersSingleMock;
            }
            return chain as any;
        });

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: testUser.email,
                password: 'WrongPassword'
            });

        expect(res.status).toBe(401);
    });

    it('should logout successfully', async () => {
        const res = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${authToken}`);

        expect([200, 204]).toContain(res.status);
    });
});
