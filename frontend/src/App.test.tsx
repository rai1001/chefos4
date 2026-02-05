import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Supabase config BEFORE importing App
vi.mock('@/config/supabase', () => ({
    supabase: {
        auth: {
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
        })),
    }
}));

// Mock AuthStore
vi.mock('./stores/authStore', () => ({
    useAuthStore: () => ({
        isAuthenticated: false,
        user: null,
        token: null,
    })
}));

// Import App after mocks
import App from './App';

describe('App', () => {
    it('renders login page by default when not authenticated', async () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </QueryClientProvider>
        );

        // It should eventually show the login page (after Suspense resolves)
        await waitFor(() => {
             const loginButton = screen.queryByRole('button', { name: /Iniciar sesión/i });
             expect(loginButton).toBeInTheDocument();
        });
    });
});
