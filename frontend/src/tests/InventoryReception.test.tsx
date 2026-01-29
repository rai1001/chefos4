import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './helpers/renderWithProviders';
import InventoryReception from '@/pages/inventory/Reception';

// Mock services
const deliveryNotesServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
  updateItem: vi.fn(),
  importToInventory: vi.fn(),
}));

const ingredientsServiceMock = vi.hoisted(() => ({
  getAll: vi.fn(),
}));

vi.mock('@/services/delivery-notes.service', () => ({
  deliveryNotesService: deliveryNotesServiceMock,
}));

vi.mock('@/services/ingredients.service', () => ({
  ingredientsService: ingredientsServiceMock,
}));

describe('InventoryReception', () => {
  beforeEach(() => {
    deliveryNotesServiceMock.list.mockReset();
    ingredientsServiceMock.getAll.mockReset();
    deliveryNotesServiceMock.importToInventory.mockReset();
  });

  it('renders delivery notes with accessible inputs', async () => {
    // Mock data
    deliveryNotesServiceMock.list.mockResolvedValue([
      {
        id: 'note-12345678',
        created_at: new Date().toISOString(),
        status: 'PENDING',
        items: [
          {
            id: 'item-1',
            description: 'Tomates',
            quantity: 5,
            ingredient_id: null,
            status: 'PENDING',
            lot_code: 'LOT123',
            expiry_date: '2024-12-31',
          },
        ],
      },
    ]);

    ingredientsServiceMock.getAll.mockResolvedValue({
      data: [{ id: 'ing-1', name: 'Tomate', units: { abbreviation: 'kg' } }],
    });

    renderWithProviders(<InventoryReception />);

    expect(await screen.findByText('Albarán #note-123')).toBeInTheDocument();
    expect(screen.getByText('Tomates')).toBeInTheDocument();

    // Check for "Importar a Inventario" button
    expect(screen.getByRole('button', { name: /importar a inventario/i })).toBeInTheDocument();

    // Check for accessible inputs (these should be present after the fix)
    expect(screen.getByLabelText(/seleccionar ingrediente/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/código de lote/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de caducidad/i)).toBeInTheDocument();
  });
});
