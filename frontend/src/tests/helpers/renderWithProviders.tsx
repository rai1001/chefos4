import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';
import React from 'react';

export function renderWithProviders(ui: React.ReactElement, opts?: { route?: string } & RenderOptions) {
    const Wrapper = createTestWrapper(opts?.route);
    return render(ui, { wrapper: Wrapper, ...opts });
}

export function createTestWrapper(route?: string) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return function TestWrapper({ children }: { children: React.ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <MemoryRouter
                    initialEntries={[route || '/']}
                    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
                >
                    {children}
                </MemoryRouter>
            </QueryClientProvider>
        );
    };
}
