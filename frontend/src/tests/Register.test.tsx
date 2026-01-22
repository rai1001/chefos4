import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../pages/auth/Register';
import { authService } from '@/services/auth.service';

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
    useAuthStore: () => ({
        setAuth: vi.fn(),
        isAuthenticated: false,
    })
}));

// Mock the auth service
vi.mock('@/services/auth.service', () => ({
    authService: {
        register: vi.fn()
    }
}));

describe('Register Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders register form', () => {
        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Register />
            </BrowserRouter>
        );
        expect(screen.getByRole('heading', { name: /Crear cuenta/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Juan Pérez/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/tu@email.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Mínimo 8 caracteres/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Mi Restaurante/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Crear cuenta gratis/i })).toBeInTheDocument();
    });

    it('validates required fields', () => {
        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Register />
            </BrowserRouter>
        );
        const submitButton = screen.getByRole('button', { name: /Crear cuenta gratis/i });
        fireEvent.click(submitButton);

        // Browsers handle 'required' validation, but we can check if service wasn't called
        expect(authService.register).not.toHaveBeenCalled();
    });
});
