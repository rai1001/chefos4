import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/renderWithProviders';
import { QuickScanner } from '@/components/kitchen/QuickScanner';
import { StockOutForm } from '@/components/kitchen/StockOutForm';

const ingredientsHookMock = vi.hoisted(() => ({
    useIngredients: vi.fn(),
}));

const html5Mock = vi.hoisted(() => ({
    Html5Qrcode: class {
        start = vi.fn().mockResolvedValue(undefined);
        stop = vi.fn().mockResolvedValue(undefined);
        constructor(_id: string) { }
    },
}));

vi.mock('html5-qrcode', () => html5Mock);

vi.mock('@/hooks/useIngredients', () => ({
    useIngredients: ingredientsHookMock.useIngredients,
}));

beforeEach(() => {
    ingredientsHookMock.useIngredients.mockReset();
});

describe('QuickScanner', () => {
    it('starts and stops scanning', async () => {
        renderWithProviders(<QuickScanner />);

        await userEvent.click(screen.getByRole('button'));
        expect(await screen.findByText('Detener Escáner')).toBeInTheDocument();

        await userEvent.click(screen.getByText('Detener Escáner'));
        expect(screen.queryByText('Detener Escáner')).not.toBeInTheDocument();
    });
});

describe('StockOutForm', () => {
    it('submits stock out and calls onSuccess', async () => {
        const onSuccess = vi.fn();
        ingredientsHookMock.useIngredients.mockReturnValue({
            data: { data: [{ id: 'ing-1', name: 'Harina', units: { abbreviation: 'kg' } }] },
        });

        renderWithProviders(<StockOutForm onSuccess={onSuccess} />);

        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(screen.getByRole('option', { name: 'Harina (kg)' }));

        const qtyInput = screen.getByRole('spinbutton');
        await userEvent.clear(qtyInput);
        await userEvent.type(qtyInput, '2');

        await userEvent.click(screen.getByText('Confirmar Salida'));
        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    });
});
