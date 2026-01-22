import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ingredientsService, CreateIngredientDto, Ingredient } from '@/services/ingredients.service';
import { useToast } from '@/components/ui/use-toast';


export function useIngredients(params?: {
    page?: number;
    limit?: number;
    search?: string;
    family_id?: string;
}) {
    return useQuery({
        queryKey: ['ingredients', params],
        queryFn: () => ingredientsService.getAll(params),
    });
}


export function useIngredient(id: string) {
    return useQuery({
        queryKey: ['ingredient', id],
        queryFn: () => ingredientsService.getById(id),
        enabled: !!id,
    });
}


export function useCreateIngredient() {
    const queryClient = useQueryClient();
    const { toast } = useToast();


    return useMutation({
        mutationFn: (data: CreateIngredientDto) => ingredientsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast({ title: 'Ingrediente creado exitosamente' });
        },
        onError: (error: any) => {
            toast({
                title: 'Error al crear ingrediente',
                description: error.response?.data?.error || 'Error desconocido',
                variant: 'destructive',
            });
        },
    });
}


export function useUpdateIngredient() {
    const queryClient = useQueryClient();
    const { toast } = useToast();


    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Ingredient> }) =>
            ingredientsService.update(id, data as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast({ title: 'Ingrediente actualizado' });
        },
        onError: (error: any) => {
            toast({
                title: 'Error al actualizar',
                description: error.response?.data?.error,
                variant: 'destructive',
            });
        },
    });
}


export function useDeleteIngredient() {
    const queryClient = useQueryClient();
    const { toast } = useToast();


    return useMutation({
        mutationFn: (id: string) => ingredientsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast({ title: 'Ingrediente eliminado' });
        },
    });
}


export function useLowStockIngredients() {
    return useQuery({
        queryKey: ['ingredients', 'low-stock'],
        queryFn: () => ingredientsService.getLowStock(),
    });
}
