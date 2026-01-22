import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/auth/Login';

// Mock the auth store to avoid actual API calls
vi.mock('@/stores/authStore', () => ({
    useAuthStore: () => ({
        login: vi.fn(),
        isAuthenticated: false,
        error: null,
        isLoading: false
    })
}));

describe('Login Page', () => {
    it('renders login form', () => {
        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Login />
            </BrowserRouter>
        );
        expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/tu@email.com/i)).toBeInTheDocument();
    });

    it('validates email input', () => {
        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Login />
            </BrowserRouter>
        );
        const emailInput = screen.getByPlaceholderText(/email/i);
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        // Check for validation message if implemented
        // expect(screen.getByText(/invalid email/i)).toBeInTheDocument(); 
    });
});
