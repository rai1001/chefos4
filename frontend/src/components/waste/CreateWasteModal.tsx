import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wasteService } from '@/services/waste.service';
import { useIngredients } from '@/hooks/useIngredients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

// Helper to format currency if not in utils
// Assuming utils has it, otherwise I'll define it here locally or check utils later.

interface CreateWasteForm {
    ingredient_id: string;
    quantity: number;
    waste_cause_id: string;
    notes: string;
}

interface CreateWasteModalProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function CreateWasteModal({ onSuccess, onCancel }: CreateWasteModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateWasteForm>();

    const [selectedIngredient, setSelectedIngredient] = useState<any>(null);

    // Fetch Ingredients
    const { data: ingredientsData } = useIngredients({ limit: 1000 }); // Get all for now
    const ingredients = ingredientsData?.data || [];

    // Fetch Causes
    const { data: causes } = useQuery({
        queryKey: ['waste-causes'],
        queryFn: wasteService.getCauses
    });

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: wasteService.logWaste,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['waste-stats'] });
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast({ title: 'Merma registrada exitosamente' });
            onSuccess?.();
            onCancel?.(); // Close modal
        },
        onError: (error: any) => {
            toast({
                title: 'Error al registrar merma',
                description: error.response?.data?.error || 'Error desconocido',
                variant: 'destructive',
            });
        }
    });

    const watchIngredientId = watch('ingredient_id');
    const watchQuantity = watch('quantity');

    useEffect(() => {
        if (watchIngredientId) {
            const ing = ingredients.find((i: any) => i.id === watchIngredientId);
            setSelectedIngredient(ing);
        } else {
            setSelectedIngredient(null);
        }
    }, [watchIngredientId, ingredients]);

    const estimatedCost = selectedIngredient ? (Number(selectedIngredient.cost_price) * (Number(watchQuantity) || 0)) : 0;

    const onSubmit = (data: CreateWasteForm) => {
        createMutation.mutate(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="ingredient">Ingrediente</Label>
                <Select
                    onValueChange={(val) => setValue('ingredient_id', val)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ingrediente" />
                    </SelectTrigger>
                    <SelectContent>
                        {ingredients.map((ing: any) => (
                            <SelectItem key={ing.id} value={ing.id}>
                                {ing.name} ({ing.units?.abbreviation})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.ingredient_id && <span className="text-sm text-red-500">Requerido</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input
                        type="number"
                        step="0.0001"
                        {...register('quantity', { required: true, min: 0 })}
                        placeholder="0.00"
                    />
                    {selectedIngredient && (
                        <p className="text-xs text-muted-foreground">
                            Stock actual: {selectedIngredient.stock_current} {selectedIngredient.units?.abbreviation}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="cause">Causa</Label>
                    <Select onValueChange={(val) => setValue('waste_cause_id', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar causa" />
                        </SelectTrigger>
                        <SelectContent>
                            {causes?.map((cause: any) => (
                                <SelectItem key={cause.id} value={cause.id}>
                                    {cause.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.waste_cause_id && <span className="text-sm text-red-500">Requerido</span>}
                </div>
            </div>

            {estimatedCost > 0 && (
                <div className="rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">Costo Estimado</p>
                    <p className="text-2xl font-bold text-destructive">
                        ${estimatedCost.toFixed(2)}
                    </p>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Textarea
                    {...register('notes')}
                    placeholder="Detalles adicionales..."
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" variant="destructive" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar Merma
                </Button>
            </div>
        </form>
    );
}
