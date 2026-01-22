import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';

describe('Sidebar Component', () => {
    it('renders all navigation items', () => {
        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Sidebar />
            </BrowserRouter>
        );

        const expectedLinks = [
            'Dashboard',
            'Ingredientes',
            'Proveedores',
            'Eventos',
            'Órdenes de Compra',
            'Albaranes (OCR)',
            'Producción',
            'Cocina',
            'Mermas',
            'Personal',
            'Hoteles',
            'Configuración',
        ];

        expectedLinks.forEach(linkText => {
            expect(screen.getByText(linkText)).toBeInTheDocument();
        });
    });

    it('has correct links for navigation items', () => {
        render(
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Sidebar />
            </BrowserRouter>
        );

        expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
        expect(screen.getByText('Ingredientes').closest('a')).toHaveAttribute('href', '/ingredients');
        expect(screen.getByText('Mermas').closest('a')).toHaveAttribute('href', '/waste');
    });
});
