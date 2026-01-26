import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationBell } from '../components/layout/NotificationBell';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/services/api';

// Mock api
vi.mock('@/services/api', () => ({
    api: {
        get: vi.fn(),
        patch: vi.fn(),
        post: vi.fn(),
    }
}));

// Mock supabase
vi.mock('@/config/supabase', () => ({
    supabase: {
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
        })),
        removeChannel: vi.fn(),
    }
}));

// Mock auth store
vi.mock('@/stores/authStore', () => ({
    useAuthStore: () => ({
        user: { name: 'Test User', organization_id: 'org123' },
    })
}));

// Mock DropdownMenu to simplify testing
vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
    DropdownMenuItem: ({ children, onSelect, onClick }: any) => (
        <div onClick={onSelect || onClick} role="menuitem">{children}</div>
    ),
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
}));

// Mock ScrollArea
vi.mock('@/components/ui/scroll-area', () => ({
    ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

// Mock Badge
vi.mock('@/components/ui/badge', () => ({
    Badge: ({ children, className }: any) => <div className={className} data-testid="badge">{children}</div>,
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            gcTime: 0,
        },
    },
});

describe('NotificationBell Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it('renders empty state when no notifications', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <QueryClientProvider client={queryClient}>
                    <NotificationBell />
                </QueryClientProvider>
            </BrowserRouter>
        );

        // Click bell to open
        const bellButton = screen.getByLabelText(/abrir notificaciones/i);
        fireEvent.click(bellButton);

        expect(await screen.findByText(/No tienes notificaciones/i)).toBeInTheDocument();
    });

    it('renders notifications list when data exists', async () => {
        const notifications = [
            { id: '1', title: 'New Order', message: 'Order #123 arrived', is_read: false, created_at: new Date().toISOString() },
            { id: '2', title: 'Stock Alert', message: 'Tomato is low', is_read: true, created_at: new Date().toISOString() },
        ];
        vi.mocked(api.get).mockResolvedValue({ data: { data: notifications } });

        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <QueryClientProvider client={queryClient}>
                    <NotificationBell />
                </QueryClientProvider>
            </BrowserRouter>
        );

        // Wait for badge to appear
        const badge = await screen.findByTestId('badge');
        expect(badge).toHaveTextContent('1');

        const bellButton = screen.getByLabelText(/abrir notificaciones/i);
        fireEvent.click(bellButton);

        expect(await screen.findByText('New Order')).toBeInTheDocument();
        expect(await screen.findByText('Stock Alert')).toBeInTheDocument();
    });

    it('marks notification as read when clicked', async () => {
        const notifications = [
            { id: '1', title: 'New Order', message: 'Order #123 arrived', is_read: false, created_at: new Date().toISOString() },
        ];
        vi.mocked(api.get).mockResolvedValue({ data: { data: notifications } });

        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <QueryClientProvider client={queryClient}>
                    <NotificationBell />
                </QueryClientProvider>
            </BrowserRouter>
        );

        const bellButton = screen.getByLabelText(/abrir notificaciones/i);
        fireEvent.click(bellButton);

        const notificationItem = await screen.findByText('New Order');
        fireEvent.click(notificationItem);

        expect(api.patch).toHaveBeenCalledWith('/notifications/1/read');
    });
});
