import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/renderWithProviders';
import { IngredientsList } from '@/components/ingredients/IngredientsList';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { CSVImportWizard } from '@/components/ingredients/CSVImportWizard';

const ingredientsHookMock = vi.hoisted(() => ({
    useDeleteIngredient: vi.fn(),
    useCreateIngredient: vi.fn(),
    useUpdateIngredient: vi.fn(),
}));

const suppliersHookMock = vi.hoisted(() => ({
    useSuppliers: vi.fn(),
}));

const productFamiliesHookMock = vi.hoisted(() => ({
    useProductFamilies: vi.fn(),
}));

const unitsHookMock = vi.hoisted(() => ({
    useUnits: vi.fn(),
}));

const apiMock = vi.hoisted(() => ({
    post: vi.fn(),
}));

vi.mock('@/hooks/useIngredients', () => ({
    useDeleteIngredient: ingredientsHookMock.useDeleteIngredient,
    useCreateIngredient: ingredientsHookMock.useCreateIngredient,
    useUpdateIngredient: ingredientsHookMock.useUpdateIngredient,
}));

vi.mock('@/hooks/useSuppliers', () => ({
    useSuppliers: suppliersHookMock.useSuppliers,
}));

vi.mock('@/hooks/useProductFamilies', () => ({
    useProductFamilies: productFamiliesHookMock.useProductFamilies,
}));

vi.mock('@/hooks/useUnits', () => ({
    useUnits: unitsHookMock.useUnits,
}));

vi.mock('@/services/api', () => ({ api: apiMock }));

beforeEach(() => {
    ingredientsHookMock.useDeleteIngredient.mockReset();
    ingredientsHookMock.useCreateIngredient.mockReset();
    ingredientsHookMock.useUpdateIngredient.mockReset();
    suppliersHookMock.useSuppliers.mockReset();
    productFamiliesHookMock.useProductFamilies.mockReset();
    productFamiliesHookMock.useProductFamilies.mockReturnValue({ data: [] });
    unitsHookMock.useUnits.mockReset();
    unitsHookMock.useUnits.mockReturnValue({ data: [] });
    apiMock.post.mockReset();
});

describe('IngredientsList', () => {
    it('renders rows and handles delete', async () => {
        const mutate = vi.fn();
        ingredientsHookMock.useDeleteIngredient.mockReturnValue({ mutate });

        renderWithProviders(
            <IngredientsList
                data={[{
                    id: 'ing-1',
                    name: 'Tomate',
                    product_families: { name: 'Verduras' },
                    suppliers: { name: 'Proveedor' },
                    stock_current: 1,
                    stock_min: 2,
                    cost_price: 2.5,
                    units: { abbreviation: 'kg' },
                } as any]}
                pagination={{ total: 1, page: 1, limit: 10, totalPages: 1 }}
                isLoading={false}
                onPageChange={vi.fn()}
            />
        );

        expect(screen.getByText('Tomate')).toBeInTheDocument();

        const deleteButton = screen.getByRole('button', { name: /eliminar ingrediente/i });
        await userEvent.click(deleteButton);
        await userEvent.click(screen.getByText('Eliminar'));

        expect(mutate).toHaveBeenCalledWith('ing-1');
    });
});

describe('IngredientForm', () => {
    it('submits create mutation', async () => {
        const mutate = vi.fn();
        ingredientsHookMock.useCreateIngredient.mockReturnValue({ mutate, isPending: false });
        ingredientsHookMock.useUpdateIngredient.mockReturnValue({ mutate: vi.fn(), isPending: false });
        suppliersHookMock.useSuppliers.mockReturnValue({ data: [{ id: 'c290f1ee-6c54-4b01-90e6-d701748f0859', name: 'Proveedor Uno' }] });
        productFamiliesHookMock.useProductFamilies.mockReturnValue({ data: [{ id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', name: 'Carnes' }] });
        unitsHookMock.useUnits.mockReturnValue({ data: [{ id: 'a290f1ee-6c54-4b01-90e6-d701748f0852', name: 'Kilogramo', abbreviation: 'kg' }] });

        renderWithProviders(<IngredientForm onSuccess={vi.fn()} />);

        await userEvent.type(screen.getByPlaceholderText('Ej: Harina de Trigo'), 'Harina');

        const comboBoxes = screen.getAllByRole('combobox');

        // Family
        await userEvent.click(comboBoxes[0]);
        await userEvent.click(screen.getByRole('option', { name: 'Carnes' }));

        // Supplier
        await userEvent.click(comboBoxes[1]);
        await userEvent.click(screen.getByRole('option', { name: 'Proveedor Uno' }));

        // Unit
        await userEvent.click(comboBoxes[2]);
        await userEvent.click(screen.getByRole('option', { name: 'Kilogramo (kg)' }));

        const numberInputs = screen.getAllByRole('spinbutton');
        await userEvent.clear(numberInputs[0]);
        await userEvent.type(numberInputs[0], '10');

        await userEvent.clear(numberInputs[1]);
        await userEvent.type(numberInputs[1], '2');

        await userEvent.clear(numberInputs[2]);
        await userEvent.type(numberInputs[2], '3');

        await userEvent.click(screen.getByText('Crear'));

        await waitFor(() => expect(mutate).toHaveBeenCalled());
    });
});

describe('CSVImportWizard', () => {
    it('handles upload -> resolve -> complete flow', async () => {
        suppliersHookMock.useSuppliers.mockReturnValue({
            data: { data: [{ id: 'sup-1', name: 'Proveedor Uno' }] },
        });

        apiMock.post.mockImplementation((url: string) => {
            if (url === '/ingredients/import/analyze') {
                return Promise.resolve({
                    data: { total_rows: 2, unknown_suppliers: ['Nuevo'], preview: [] },
                });
            }
            if (url === '/ingredients/import/execute') {
                return Promise.resolve({
                    data: { imported: 2, updated: 0, created_suppliers: 1, errors: [] },
                });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithProviders(<CSVImportWizard />);

        const file = new File(['id,name'], 'items.csv', { type: 'text/csv' });
        const label = screen.getByText('Selecciona un archivo CSV o Excel').closest('label');
        const input = label?.querySelector('input[type=\"file\"]');
        expect(input).toBeTruthy();
        fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

        await userEvent.click(screen.getByText('Analizar Archivo'));
        expect(await screen.findByText(/Se encontraron 1 proveedores/i)).toBeInTheDocument();

        await userEvent.click(screen.getByText('Importar 2 productos'));
        expect(await screen.findByText('¡Importación completada!')).toBeInTheDocument();
    });
});
