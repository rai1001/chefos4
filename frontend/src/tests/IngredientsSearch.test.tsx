import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './helpers/renderWithProviders';
import Ingredients from '@/pages/Ingredients';

const ingredientsHookMock = vi.hoisted(() => ({
    useIngredients: vi.fn(),
    useLowStockIngredients: vi.fn(),
    useCreateIngredient: vi.fn(),
    useUpdateIngredient: vi.fn(),
    useDeleteIngredient: vi.fn(),
}));

vi.mock('@/hooks/useIngredients', () => ({
    useIngredients: ingredientsHookMock.useIngredients,
    useLowStockIngredients: ingredientsHookMock.useLowStockIngredients,
    useCreateIngredient: ingredientsHookMock.useCreateIngredient,
    useUpdateIngredient: ingredientsHookMock.useUpdateIngredient,
    useDeleteIngredient: ingredientsHookMock.useDeleteIngredient,
}));

// Mock other dependencies
vi.mock('@/components/ingredients/IngredientsList', () => ({
    IngredientsList: () => <div>IngredientsList</div>,
}));
vi.mock('@/components/ingredients/IngredientForm', () => ({
    IngredientForm: () => <div>IngredientForm</div>,
}));
vi.mock('@/components/ingredients/CSVImportWizard', () => ({
    CSVImportWizard: () => <div>CSVImportWizard</div>,
}));

describe('Ingredients Search Debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        ingredientsHookMock.useIngredients.mockReturnValue({
            data: { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } },
            isLoading: false,
        });
        ingredientsHookMock.useLowStockIngredients.mockReturnValue({
            data: [],
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('debounces search input calls to API', async () => {
        renderWithProviders(<Ingredients />);

        const searchInput = screen.getByPlaceholderText('Buscar ingredientes...');

        // Initial call
        expect(ingredientsHookMock.useIngredients).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' }));

        // Type 'a'
        fireEvent.change(searchInput, { target: { value: 'a' } });

        // Should still be '' because of debounce
        expect(ingredientsHookMock.useIngredients).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' }));

        // Advance 200ms (less than 500ms)
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(ingredientsHookMock.useIngredients).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' }));

        // Advance remaining 300ms
        act(() => {
            vi.advanceTimersByTime(300);
        });

        // Now it should be called with 'a'
        expect(ingredientsHookMock.useIngredients).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'a' }));
    });
});
