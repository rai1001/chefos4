import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Ingredients from '../pages/Ingredients';
import { createTestWrapper } from './helpers/renderWithProviders';

// Mock dependencies
const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({ toast: toastMock }),
}));

// Mock useIngredients to spy on arguments
const useIngredientsMock = vi.fn();
vi.mock('@/hooks/useIngredients', () => ({
    useIngredients: (args: any) => {
        useIngredientsMock(args);
        return {
            data: { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } },
            isLoading: false
        };
    },
    useDeleteIngredient: () => ({ mutate: vi.fn() }),
}));

// Mock child components to avoid complexity
vi.mock('@/components/ingredients/IngredientsList', () => ({
    IngredientsList: () => <div data-testid="ingredients-list">List</div>,
}));
vi.mock('@/components/ingredients/IngredientForm', () => ({
    IngredientForm: () => <div>Form</div>,
}));
vi.mock('@/components/ingredients/CSVImportWizard', () => ({
    CSVImportWizard: () => <div>Import</div>,
}));

describe('Ingredients Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render ingredients page', () => {
        const wrapper = createTestWrapper();
        render(<Ingredients />, { wrapper });
        expect(screen.getByText('Ingredientes')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Buscar ingredientes...')).toBeInTheDocument();
    });

    it('should pass debounced search to useIngredients', async () => {
        vi.useFakeTimers();
        const wrapper = createTestWrapper();
        render(<Ingredients />, { wrapper });

        // Initial call
        expect(useIngredientsMock).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' }));

        // Type in search box
        const input = screen.getByPlaceholderText('Buscar ingredientes...');

        act(() => {
            fireEvent.change(input, { target: { value: 'tomato' } });
        });

        // Should not have updated immediately (debounce is 500ms)
        expect(useIngredientsMock).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' }));

        // Advance timers
        act(() => {
             vi.advanceTimersByTime(500);
        });

        // Now it should have been called with 'tomato'
        expect(useIngredientsMock).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'tomato' }));

        vi.useRealTimers();
    });
});
