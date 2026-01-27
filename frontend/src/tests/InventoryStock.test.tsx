import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './helpers/renderWithProviders';
import InventoryStock from '@/pages/inventory/Stock';

const inventoryServiceMock = vi.hoisted(() => ({
    listStockSummary: vi.fn(),
}));

vi.mock('@/services/inventory.service', () => ({
    inventoryService: inventoryServiceMock,
}));

describe('InventoryStock', () => {
    it('renders search input with icon', async () => {
        inventoryServiceMock.listStockSummary.mockResolvedValue([]);

        renderWithProviders(<InventoryStock />);

        // Wait for potential loading state if needed, but the search input is rendered immediately
        const input = screen.getByPlaceholderText('Buscar ingrediente...');
        expect(input).toBeInTheDocument();

        // This expectation will fail initially
        // I expect the input to have 'pl-10' class for padding-left to accommodate the icon
        expect(input).toHaveClass('pl-10');
    });
});
