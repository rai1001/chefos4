import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './helpers/renderWithProviders';
import InventoryStock from '@/pages/inventory/Stock';

const inventoryServiceMock = vi.hoisted(() => ({
    listStockSummary: vi.fn(),
}));

vi.mock('@/services/inventory.service', () => ({ inventoryService: inventoryServiceMock }));

describe('InventoryStock UX', () => {
    beforeEach(() => {
        inventoryServiceMock.listStockSummary.mockReset();
    });

    it('displays loading spinner when data is fetching', () => {
        // We simulate loading by returning a promise that doesn't resolve immediately
        // However, TanStack Query's useQuery handles isLoading.
        // We can mock the implementation to delay or just check initial state if we could control useQuery.
        // For simplicity with full render, we can just delay the resolution.

        let resolvePromise: (value: any) => void;
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        inventoryServiceMock.listStockSummary.mockReturnValue(promise);

        renderWithProviders(<InventoryStock />);

        // This expects the NEW loading text
        expect(screen.getByText('Cargando inventario...')).toBeInTheDocument();

        // Resolve to clean up
        if (resolvePromise!) resolvePromise([]);
    });

    it('displays enhanced empty state when no data is found', async () => {
        inventoryServiceMock.listStockSummary.mockResolvedValue([]);

        renderWithProviders(<InventoryStock />);

        await waitFor(() => {
            // This expects the NEW empty state text
            expect(screen.getByText('No se encontró stock disponible.')).toBeInTheDocument();
        });

        // Check for the clear button (part of new UX)
        // It should only appear if there is a search term?
        // Wait, the plan said: "icon + text + clear action".
        // If the list is empty from the start, maybe no clear action.
        // But if we search and find nothing, then clear action.
        // Let's check the code I planned:
        // {search && <Button ...>Limpiar búsqueda</Button>}
        // So initially it won't be there.
    });

    it('shows search icon and filters data', async () => {
         const mockData = [
            { id: '1', name: 'Tomate', stock_current: 10, units: { abbreviation: 'kg' }, cost_price: 5, next_expiry_date: '2024-01-01' },
            { id: '2', name: 'Lechuga', stock_current: 5, units: { abbreviation: 'units' }, cost_price: 2, next_expiry_date: '2024-01-02' }
        ];
        inventoryServiceMock.listStockSummary.mockResolvedValue(mockData);

        renderWithProviders(<InventoryStock />);

        await waitFor(() => {
            expect(screen.getByText('Tomate')).toBeInTheDocument();
            expect(screen.getByText('Lechuga')).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText('Buscar ingrediente...');
        fireEvent.change(input, { target: { value: 'Tomate' } });

        await waitFor(() => {
            expect(screen.getByText('Tomate')).toBeInTheDocument();
            expect(screen.queryByText('Lechuga')).not.toBeInTheDocument();
        });
    });

    it('shows empty state with clear button when search yields no results', async () => {
         const mockData = [
            { id: '1', name: 'Tomate', stock_current: 10, units: { abbreviation: 'kg' }, cost_price: 5, next_expiry_date: '2024-01-01' },
        ];
        inventoryServiceMock.listStockSummary.mockResolvedValue(mockData);

        renderWithProviders(<InventoryStock />);

        await waitFor(() => {
            expect(screen.getByText('Tomate')).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText('Buscar ingrediente...');
        fireEvent.change(input, { target: { value: 'Zanahoria' } });

        await waitFor(() => {
            expect(screen.getByText('No se encontró stock disponible.')).toBeInTheDocument();
            expect(screen.getByText('Limpiar búsqueda')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Limpiar búsqueda'));

        await waitFor(() => {
            expect(input).toHaveValue('');
            expect(screen.getByText('Tomate')).toBeInTheDocument();
        });
    });
});
