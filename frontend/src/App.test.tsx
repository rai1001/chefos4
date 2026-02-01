import { describe, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock the supabase config to avoid "Missing Supabase environment variables" error
// because the real file throws at top-level if env vars are missing.
vi.mock('@/config/supabase', () => ({
    supabase: {
        auth: {
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        },
        channel: vi.fn(() => ({
             on: vi.fn().mockReturnThis(),
             subscribe: vi.fn(),
             unsubscribe: vi.fn(),
        })),
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnValue({ data: null, error: null }),
        })),
    },
}));

describe('App Diagnosis', () => {
    it('should render without crashing', async () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <App />
                </MemoryRouter>
            </QueryClientProvider>
        );

        await waitFor(() => {
             expect(document.body).toBeTruthy();
        });
    });
});
