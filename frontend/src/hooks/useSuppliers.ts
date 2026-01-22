import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersService, CreateSupplierDto } from '@/services/suppliers.service';
import { useToast } from '@/components/ui/use-toast';

export function useSuppliers(search?: string) {
    return useQuery({
        queryKey: ['suppliers', search],
        queryFn: () => suppliersService.getAll(search),
    });
}

export function useSupplier(id: string) {
    return useQuery({
        queryKey: ['supplier', id],
        queryFn: () => suppliersService.getById(id),
        enabled: !!id,
    });
}

export function useCreateSupplier() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: CreateSupplierDto) => suppliersService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast({ title: 'Proveedor creado exitosamente' });
        },
    });
}

export function useSuppliersWithCutoff() {
    return useQuery({
        queryKey: ['suppliers', 'cutoff'],
        queryFn: () => suppliersService.getWithCutoffStatus(),
        refetchInterval: 60000, // Cada minuto
    });
}
