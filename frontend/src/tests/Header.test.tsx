import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '../components/layout/Header';

// Mock NotificationBell
vi.mock('../components/layout/NotificationBell', () => ({
    NotificationBell: () => <div data-testid="notification-bell">Bell</div>
}));

// Mock DropdownMenu to simplify testing
vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
    DropdownMenuItem: ({ children, onClick }: any) => (
        <div onClick={onClick}>{children}</div>
    ),
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
}));

// Mock auth store
const mockLogout = vi.fn();
vi.mock('@/stores/authStore', () => ({
    useAuthStore: () => ({
        user: { name: 'Test User', email: 'test@example.com' },
        logout: mockLogout
    })
}));

describe('Header Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders logo and user info', () => {
        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Header />
            </BrowserRouter>
        );

        expect(screen.getByText(/CulinaryOS/i)).toBeInTheDocument();
        expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('displays user name and email in dropdown', async () => {
        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Header />
            </BrowserRouter>
        );

        // Trigger dropdown
        const userButton = screen.getByTestId('user-menu-button');
        fireEvent.click(userButton);

        expect(await screen.findByText('Test User')).toBeInTheDocument();
        expect(await screen.findByText('test@example.com')).toBeInTheDocument();
    });

    it('calls logout when clicked', async () => {
        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Header />
            </BrowserRouter>
        );

        const userButton = screen.getByTestId('user-menu-button');
        fireEvent.click(userButton);

        const logoutOption = await screen.findByText(/Cerrar sesión/i);
        fireEvent.click(logoutOption);

        expect(mockLogout).toHaveBeenCalled();
    });
});
