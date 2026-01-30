import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/renderWithProviders';
import InventoryStock from '@/pages/inventory/Stock';
import { inventoryService } from '@/services/inventory.service';

// Mock the service
vi.mock('@/services/inventory.service', () => ({
    inventoryService: {
        listStockSummary: vi.fn(),
    },
}));

describe('InventoryStock UX', () => {
    it('shows clear button only when text is entered and clears search on click', async () => {
        (inventoryService.listStockSummary as any).mockResolvedValue([]);

        renderWithProviders(<InventoryStock />);

        const input = screen.getByPlaceholderText('Buscar ingrediente...');

        // Initially clear button should not be visible (or not exist)
        expect(screen.queryByLabelText('Limpiar busqueda')).not.toBeInTheDocument();

        await userEvent.type(input, 'Tomate');
        expect(input).toHaveValue('Tomate');

        // This should fail initially because the button doesn't exist
        const clearButton = screen.getByLabelText('Limpiar busqueda');
        await userEvent.click(clearButton);

        expect(input).toHaveValue('');
    });

    it('shows rich empty state with clear action when search yields no results', async () => {
        (inventoryService.listStockSummary as any).mockResolvedValue([]);

        renderWithProviders(<InventoryStock />);

        // Initial empty state (before search)
        // Current: "No hay stock disponible."
        // New: "No hay stock disponible." (text might be same, but we check for structure or class later if needed)
        expect(await screen.findByText('No hay stock disponible.')).toBeInTheDocument();

        const input = screen.getByPlaceholderText('Buscar ingrediente...');
        await userEvent.type(input, 'NonExistentItem');

        // This text is part of the new design
        expect(await screen.findByText('No se encontraron ingredientes.')).toBeInTheDocument();

        // Check for the clear action in the empty state
        const clearAction = screen.getByText('Limpiar filtros');
        await userEvent.click(clearAction);

        expect(input).toHaveValue('');
    });
});
