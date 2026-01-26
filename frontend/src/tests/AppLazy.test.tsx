import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

describe('App Lazy Loading', () => {
    it('renders without crashing and resolves to login page', async () => {
        const queryClient = new QueryClient();
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/login']}>
                    <App />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // It should eventually show the login page content
        // "CulinaryOS" is in the login page
        await waitFor(() => {
            expect(screen.getByText(/CulinaryOS/i)).toBeInTheDocument();
        });
    });
});
