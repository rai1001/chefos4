import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersService, PurchaseOrder } from '@/services/purchase-orders.service';
import { useToast } from '@/components/ui/use-toast';


export function usePurchaseOrders(params?: {
    status?: string;
    supplier_id?: string;
    event_id?: string;
    page?: number;
    limit?: number;
}) {
    return useQuery({
        queryKey: ['purchase-orders', params],
        queryFn: () => purchaseOrdersService.getAll(params),
    });
}


export function usePurchaseOrder(id: string) {
    return useQuery({
        queryKey: ['purchase-order', id],
        queryFn: () => purchaseOrdersService.getById(id),
        enabled: !!id,
    });
}


export function useCreatePurchaseOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();


    return useMutation({
        mutationFn: (data: any) => purchaseOrdersService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            toast({ title: 'Orden de compra creada' });
        },
        onError: (error: any) => {
            toast({
                title: 'Error al crear orden',
                description: error.response?.data?.error || 'Error desconocido',
                variant: 'destructive',
            });
        },
    });
}


export function useUpdatePOStatus() {
    const queryClient = useQueryClient();
    const { toast } = useToast();


    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            purchaseOrdersService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            toast({ title: 'Estado actualizado' });
        },
    });
}


export function useReceiveItems() {
    const queryClient = useQueryClient();
    const { toast } = useToast();


    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            purchaseOrdersService.receiveItems(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast({ title: 'Items recibidos y stock actualizado' });
        },
    });
}


export function useDeletePurchaseOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();


    return useMutation({
        mutationFn: (id: string) => purchaseOrdersService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            toast({ title: 'Orden eliminada' });
        },
    });
}
