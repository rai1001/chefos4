import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestWrapper } from './helpers/renderWithProviders';
import React from 'react';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({ toast: toastMock }),
}));

const ingredientsService = vi.hoisted(() => ({
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getLowStock: vi.fn(),
}));
vi.mock('@/services/ingredients.service', () => ({
    ingredientsService,
}));

const suppliersService = vi.hoisted(() => ({
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    estimateDelivery: vi.fn(),
    getWithCutoffStatus: vi.fn(),
}));
vi.mock('@/services/suppliers.service', () => ({
    suppliersService,
}));

const purchaseOrdersService = vi.hoisted(() => ({
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    receiveItems: vi.fn(),
    delete: vi.fn(),
}));
vi.mock('@/services/purchase-orders.service', () => ({
    purchaseOrdersService,
}));

const apiMock = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
}));
vi.mock('@/services/api', () => ({
    api: apiMock,
}));

const supabaseMock = vi.hoisted(() => ({
    channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue('chan'),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: [], error: null }),
    })),
}));
vi.mock('@/config/supabase', () => ({
    supabase: supabaseMock,
}));

import { useIngredients, useIngredient, useCreateIngredient, useUpdateIngredient, useDeleteIngredient, useLowStockIngredients } from '@/hooks/useIngredients';
import { useSuppliers, useSupplier, useCreateSupplier, useSuppliersWithCutoff } from '@/hooks/useSuppliers';
import { useEvents } from '@/hooks/useEvents';
import { usePurchaseOrders, usePurchaseOrder, useCreatePurchaseOrder, useUpdatePOStatus, useReceiveItems, useDeletePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useProductionTasks } from '@/hooks/useProductionTasks';
import { useNotifications } from '@/hooks/useNotifications';
import { useEventDeadlines } from '@/hooks/useEventDeadlines';

const wrapper = createTestWrapper();

describe('hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('useIngredients and useIngredient', async () => {
        ingredientsService.getAll.mockResolvedValue({ data: [{ id: 'i1' }], total: 1 });
        const { result } = renderHook(() => useIngredients({ search: 'tom' }), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        ingredientsService.getById.mockResolvedValueOnce({ id: 'i1' });
        const { result: one } = renderHook(() => useIngredient('i1'), { wrapper });
        await waitFor(() => expect(one.current.isSuccess).toBe(true));

        const { result: disabled } = renderHook(() => useIngredient(''), { wrapper });
        expect(disabled.current.isFetching).toBe(false);
    });

    it('useCreateIngredient handles success and error', async () => {
        ingredientsService.create.mockResolvedValueOnce({ id: 'i1' });
        const { result } = renderHook(() => useCreateIngredient(), { wrapper });
        await result.current.mutateAsync({ name: 'x', cost_price: 1, unit_id: 'u1' } as any);
        expect(toastMock).toHaveBeenCalledWith({ title: 'Ingrediente creado exitosamente' });

        ingredientsService.create.mockRejectedValueOnce({ response: { data: { error: 'boom' } } });
        await expect(result.current.mutateAsync({ name: 'x', cost_price: 1, unit_id: 'u1' } as any)).rejects.toBeDefined();
        expect(toastMock).toHaveBeenCalledWith({
            title: 'Error al crear ingrediente',
            description: 'boom',
            variant: 'destructive',
        });
    });

    it('useUpdateIngredient and useDeleteIngredient', async () => {
        ingredientsService.update.mockResolvedValueOnce({ id: 'i1' });
        const { result: update } = renderHook(() => useUpdateIngredient(), { wrapper });
        await update.current.mutateAsync({ id: 'i1', data: { name: 'y' } });
        expect(toastMock).toHaveBeenCalledWith({ title: 'Ingrediente actualizado' });

        ingredientsService.update.mockRejectedValueOnce({ response: { data: { error: 'bad' } } });
        await expect(update.current.mutateAsync({ id: 'i1', data: { name: 'y' } })).rejects.toBeDefined();

        ingredientsService.delete.mockResolvedValueOnce({});
        const { result: del } = renderHook(() => useDeleteIngredient(), { wrapper });
        await del.current.mutateAsync('i1');
        expect(toastMock).toHaveBeenCalledWith({ title: 'Ingrediente eliminado' });
    });

    it('useLowStockIngredients', async () => {
        ingredientsService.getLowStock.mockResolvedValueOnce([{ id: 'i-low' }]);
        const { result } = renderHook(() => useLowStockIngredients(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useSuppliers and useSupplier', async () => {
        suppliersService.getAll.mockResolvedValue({ data: [{ id: 's1' }], total: 1 });
        const { result } = renderHook(() => useSuppliers('s'), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        suppliersService.getById.mockResolvedValueOnce({ id: 's1' });
        const { result: one } = renderHook(() => useSupplier('s1'), { wrapper });
        await waitFor(() => expect(one.current.isSuccess).toBe(true));
    });

    it('useCreateSupplier and useSuppliersWithCutoff', async () => {
        suppliersService.create.mockResolvedValueOnce({ id: 's1' });
        const { result } = renderHook(() => useCreateSupplier(), { wrapper });
        await result.current.mutateAsync({ name: 'S' } as any);
        expect(toastMock).toHaveBeenCalledWith({ title: 'Proveedor creado exitosamente' });

        suppliersService.getWithCutoffStatus.mockResolvedValueOnce([{ id: 's1' }]);
        const { result: cutoff } = renderHook(() => useSuppliersWithCutoff(), { wrapper });
        await waitFor(() => expect(cutoff.current.isSuccess).toBe(true));
    });

    it('useEvents', async () => {
        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'e1' }] } });
        const { result } = renderHook(() => useEvents({ status: 'CONFIRMED' }), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('usePurchaseOrders and mutations', async () => {
        purchaseOrdersService.getAll.mockResolvedValue({ data: [{ id: 'po1' }], total: 1 });
        const { result } = renderHook(() => usePurchaseOrders({ status: 'DRAFT' }), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        purchaseOrdersService.getById.mockResolvedValueOnce({ id: 'po1' });
        const { result: one } = renderHook(() => usePurchaseOrder('po1'), { wrapper });
        await waitFor(() => expect(one.current.isSuccess).toBe(true));

        purchaseOrdersService.create.mockResolvedValueOnce({ id: 'po2' });
        const { result: create } = renderHook(() => useCreatePurchaseOrder(), { wrapper });
        await create.current.mutateAsync({ supplier_id: 's1', items: [] });
        expect(toastMock).toHaveBeenCalledWith({ title: 'Orden de compra creada' });

        purchaseOrdersService.updateStatus.mockResolvedValueOnce({ id: 'po1', status: 'SENT' });
        const { result: update } = renderHook(() => useUpdatePOStatus(), { wrapper });
        await update.current.mutateAsync({ id: 'po1', status: 'SENT' });
        expect(toastMock).toHaveBeenCalledWith({ title: 'Estado actualizado' });

        purchaseOrdersService.receiveItems.mockResolvedValueOnce({ id: 'po1', status: 'RECEIVED' });
        const { result: receive } = renderHook(() => useReceiveItems(), { wrapper });
        await receive.current.mutateAsync({ id: 'po1', data: { items: [] } });
        expect(toastMock).toHaveBeenCalledWith({ title: 'Items recibidos y stock actualizado' });

        purchaseOrdersService.delete.mockResolvedValueOnce({});
        const { result: del } = renderHook(() => useDeletePurchaseOrder(), { wrapper });
        await del.current.mutateAsync('po1');
        expect(toastMock).toHaveBeenCalledWith({ title: 'Orden eliminada' });
    });

    it('useProductionTasks with and without filter', async () => {
        supabaseMock.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [{ id: 't1' }], error: null }),
        });
        const { result } = renderHook(() => useProductionTasks({ event_id: 'e1' }), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useNotifications subscribe/unsubscribe + mutations', async () => {
        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'n1' }] } });
        apiMock.patch.mockResolvedValueOnce({ data: {} });
        apiMock.post.mockResolvedValueOnce({ data: {} });

        const { result, unmount } = renderHook(() => useNotifications(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        await result.current.markAsRead.mutateAsync('n1');
        await result.current.markAllAsRead.mutateAsync();

        unmount();
        expect(supabaseMock.removeChannel).toHaveBeenCalled();
    });

    it('useEventDeadlines', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({
                event: { date_start: '2024-01-10' },
                demands: [{ supplier_id: 's1' }],
            }),
        });
        (global as any).fetch = fetchMock;

        suppliersService.getAll.mockResolvedValueOnce({ data: [{ id: 's1', lead_time_days: 3 }] });
        const { result } = renderHook(() => useEventDeadlines('e1'), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.criticalDeadline).toBeInstanceOf(Date);
    });
});
