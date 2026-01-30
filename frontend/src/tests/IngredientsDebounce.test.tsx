import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './helpers/renderWithProviders';
import Ingredients from '@/pages/Ingredients';

const ingredientsHookMock = vi.hoisted(() => ({
    useIngredients: vi.fn(),
    useLowStockIngredients: vi.fn(),
}));

vi.mock('@/hooks/useIngredients', () => ({
    useIngredients: ingredientsHookMock.useIngredients,
    useLowStockIngredients: ingredientsHookMock.useLowStockIngredients,
}));

// Mock child components to avoid rendering complexity
vi.mock('@/components/ingredients/IngredientsList', () => ({
    IngredientsList: () => <div>IngredientsList</div>,
}));
vi.mock('@/components/ingredients/IngredientForm', () => ({
    IngredientForm: () => <div>IngredientForm</div>,
}));
vi.mock('@/components/ingredients/CSVImportWizard', () => ({
    CSVImportWizard: () => <div>CSVImportWizard</div>,
}));
vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

describe('Ingredients Debounce', () => {
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

    it('debounces search input', () => {
        renderWithProviders(<Ingredients />);

        // Initial call with empty string
        expect(ingredientsHookMock.useIngredients).toHaveBeenCalledWith(expect.objectContaining({ search: '' }));
        ingredientsHookMock.useIngredients.mockClear();

        const searchInput = screen.getByPlaceholderText('Buscar ingredientes...');

        // Change input value
        fireEvent.change(searchInput, { target: { value: 'test' } });

        // Immediately after typing, the hook should NOT have been called with 'test' yet
        expect(ingredientsHookMock.useIngredients).not.toHaveBeenCalledWith(expect.objectContaining({ search: 'test' }));

        // Advance time by 500ms
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Now it should be called with 'test'
        expect(ingredientsHookMock.useIngredients).toHaveBeenCalledWith(expect.objectContaining({ search: 'test' }));
    });
});
