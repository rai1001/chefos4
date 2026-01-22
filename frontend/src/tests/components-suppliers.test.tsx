import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/renderWithProviders';
import { SupplierForm } from '@/components/suppliers/SupplierForm';
import { SupplierCountdown } from '@/components/suppliers/SupplierCountdown';

const suppliersServiceMock = vi.hoisted(() => ({
    create: vi.fn(),
    update: vi.fn(),
}));

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/suppliers.service', () => ({ suppliersService: suppliersServiceMock }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

beforeEach(() => {
    suppliersServiceMock.create.mockReset();
    suppliersServiceMock.update.mockReset();
    toastMock.mockReset();
});

describe('SupplierForm', () => {
    it('submits new supplier', async () => {
        suppliersServiceMock.create.mockResolvedValueOnce({});
        const onSuccess = vi.fn();

        renderWithProviders(<SupplierForm onSuccess={onSuccess} />);

        const textInputs = screen.getAllByRole('textbox');
        await userEvent.type(textInputs[0], 'Proveedor Test');
        await userEvent.click(screen.getByText('Guardar Proveedor'));

        await waitFor(() => expect(suppliersServiceMock.create).toHaveBeenCalled());
    });
});

describe('SupplierCountdown', () => {
    it('shows placeholder when no cutoff', () => {
        renderWithProviders(<SupplierCountdown />);
        expect(screen.getByText('Sin cutoff')).toBeInTheDocument();
    });
});
