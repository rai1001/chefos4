import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/renderWithProviders';
import Ingredients from '@/pages/Ingredients';
import Suppliers from '@/pages/Suppliers';

// Mock dependencies
const ingredientsHookMock = vi.hoisted(() => ({
    useIngredients: vi.fn(),
    useLowStockIngredients: vi.fn(),
    useCreateIngredient: vi.fn(),
    useUpdateIngredient: vi.fn(),
    useDeleteIngredient: vi.fn(),
    useIngredient: vi.fn(),
}));

const suppliersHookMock = vi.hoisted(() => ({
    useSuppliers: vi.fn(),
    useCreateSupplier: vi.fn(),
    useSupplier: vi.fn(),
    useSuppliersWithCutoff: vi.fn(),
}));

const productFamiliesHookMock = vi.hoisted(() => ({
    useProductFamilies: vi.fn(),
}));

vi.mock('@/hooks/useIngredients', () => ({
    useIngredients: ingredientsHookMock.useIngredients,
    useLowStockIngredients: ingredientsHookMock.useLowStockIngredients,
    useCreateIngredient: ingredientsHookMock.useCreateIngredient,
    useUpdateIngredient: ingredientsHookMock.useUpdateIngredient,
    useDeleteIngredient: ingredientsHookMock.useDeleteIngredient,
    useIngredient: ingredientsHookMock.useIngredient,
}));

vi.mock('@/hooks/useSuppliers', () => ({
    useSuppliers: suppliersHookMock.useSuppliers,
    useCreateSupplier: suppliersHookMock.useCreateSupplier,
    useSupplier: suppliersHookMock.useSupplier,
    useSuppliersWithCutoff: suppliersHookMock.useSuppliersWithCutoff,
}));

vi.mock('@/hooks/useProductFamilies', () => ({
    useProductFamilies: productFamiliesHookMock.useProductFamilies,
}));

// Mock child components to avoid detailed rendering issues
vi.mock('@/components/ingredients/IngredientsList', () => ({
    IngredientsList: () => <div data-testid="ingredients-list">IngredientsList</div>,
}));

vi.mock('@/components/ingredients/IngredientForm', () => ({
    IngredientForm: () => <div>IngredientForm</div>,
}));

vi.mock('@/components/ingredients/CSVImportWizard', () => ({
    CSVImportWizard: () => <div>CSVImportWizard</div>,
}));

vi.mock('@/components/suppliers/SupplierForm', () => ({
    SupplierForm: () => <div>SupplierForm</div>,
}));

vi.mock('@/components/suppliers/SupplierCountdown', () => ({
    SupplierCountdown: () => <div>SupplierCountdown</div>,
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('Debounced Search Tests', () => {
    it('debounces search in Ingredients page', async () => {
        ingredientsHookMock.useIngredients.mockReturnValue({
            data: { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } },
            isLoading: false,
        });
        ingredientsHookMock.useLowStockIngredients.mockReturnValue({ data: [] });

        renderWithProviders(<Ingredients />);

        const input = screen.getByPlaceholderText('Buscar ingredientes...');
        await userEvent.type(input, 'tomato');

        // Initial call should be with empty string (initial state)
        expect(ingredientsHookMock.useIngredients).toHaveBeenCalledWith(expect.objectContaining({ search: '' }));

        // Wait for debounce (300ms)
        await waitFor(() => {
             expect(ingredientsHookMock.useIngredients).toHaveBeenCalledWith(expect.objectContaining({ search: 'tomato' }));
        }, { timeout: 1000 });
    });

    it('debounces search in Suppliers page', async () => {
        suppliersHookMock.useSuppliers.mockReturnValue({
            data: { data: [] },
            isLoading: false,
            refetch: vi.fn(),
        });
        productFamiliesHookMock.useProductFamilies.mockReturnValue({ data: [] });

        renderWithProviders(<Suppliers />);

        const input = screen.getByPlaceholderText('Buscar proveedor...');
        await userEvent.type(input, 'vendor');

        // Initial call should be with empty string
        expect(suppliersHookMock.useSuppliers).toHaveBeenCalledWith('');

        // Wait for debounce
        await waitFor(() => {
             expect(suppliersHookMock.useSuppliers).toHaveBeenCalledWith('vendor');
        }, { timeout: 1000 });
    });
});
