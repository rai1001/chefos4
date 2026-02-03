import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCreateIngredient, useUpdateIngredient } from '@/hooks/useIngredients';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useUnits } from '@/hooks/useUnits';
import { useProductFamilies } from '@/hooks/useProductFamilies';
import { Ingredient } from '@/services/ingredients.service';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { productFamiliesService } from '@/services/product-families.service';

// Form Schema
const formSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    family_id: z.string().uuid('Selecciona una familia válida').optional().or(z.literal('__none__')),
    supplier_id: z.string().uuid('Selecciona un proveedor válido'),
    stock_current: z.coerce.number().min(0, 'El stock no puede ser negativo'),
    stock_min: z.coerce.number().min(0, 'El stock mínimo no puede ser negativo'),
    cost_price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
    unit_id: z.string().uuid('Selecciona una unidad válida'),
});

type FormValues = z.infer<typeof formSchema>;

interface IngredientFormProps {
    ingredient?: Ingredient;
    onSuccess?: () => void;
}

export function IngredientForm({ ingredient, onSuccess }: IngredientFormProps) {
    const createMutation = useCreateIngredient();
    const updateMutation = useUpdateIngredient();
    const queryClient = useQueryClient();
    const { data: suppliersResponse } = useSuppliers();
    const { data: families } = useProductFamilies();
    const { data: units } = useUnits();
    const suppliers = Array.isArray(suppliersResponse)
        ? suppliersResponse
        : suppliersResponse?.data ?? [];
    const [newFamilyName, setNewFamilyName] = useState('');
    const [isCreatingFamily, setIsCreatingFamily] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            family_id: '__none__',
            supplier_id: '',
            unit_id: '',
            stock_current: 0,
            stock_min: 0,
            cost_price: 0,
        },
    });

    useEffect(() => {
        if (ingredient) {
            form.reset({
                name: ingredient.name ?? '',
                family_id: ingredient.family_id ?? '__none__',
                supplier_id: ingredient.supplier_id ?? '',
                unit_id: ingredient.unit_id ?? '',
                stock_current: ingredient.stock_current ?? 0,
                stock_min: ingredient.stock_min ?? 0,
                cost_price: ingredient.cost_price ?? 0,
            });
        }
    }, [ingredient, form]);

    const onSubmit = async (values: FormValues) => {
        const nameToCreate = newFamilyName.trim();
        let familyId = values.family_id === '__none__' ? null : values.family_id;

        if (nameToCreate) {
            const existing = (families || []).find(
                (family) => family.name.toLowerCase() === nameToCreate.toLowerCase()
            );

            if (existing) {
                familyId = existing.id;
                setNewFamilyName('');
            } else {
                setIsCreatingFamily(true);
                try {
                    const created = await productFamiliesService.create({ name: nameToCreate });
                    await queryClient.invalidateQueries({ queryKey: ['product-families'] });
                    familyId = created.id;
                    setNewFamilyName('');
                } catch (error) {
                    // Keep the current family selection if creation fails.
                } finally {
                    setIsCreatingFamily(false);
                }
            }
        }

        const payload = {
            ...values,
            family_id: familyId,
        };

        if (ingredient) {
            (updateMutation.mutate as any)(
                { id: ingredient.id, data: payload },
                { onSuccess }
            );
        } else {
            createMutation.mutate(payload as any, { onSuccess });
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    const handleCreateFamily = async () => {
        const name = newFamilyName.trim();
        if (!name || isCreatingFamily) return;

        const existing = (families || []).find(
            (family) => family.name.toLowerCase() === name.toLowerCase()
        );

        if (existing) {
            form.setValue('family_id', existing.id, { shouldDirty: true });
            setNewFamilyName('');
            return;
        }

        setIsCreatingFamily(true);
        try {
            const created = await productFamiliesService.create({ name });
            await queryClient.invalidateQueries({ queryKey: ['product-families'] });
            form.setValue('family_id', created.id, { shouldDirty: true });
            setNewFamilyName('');
        } catch (error) {
            // noop: keeping UI simple, backend returns 409 on duplicates
        } finally {
            setIsCreatingFamily(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Ingrediente</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej: Harina de Trigo" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="family_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Familia</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="__none__">Sin familia</SelectItem>
                                        {(families || []).map((family) => (
                                            <SelectItem key={family.id} value={family.id}>
                                                {family.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="supplier_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Proveedor</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {suppliers?.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="unit_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Unidad</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {(units || []).map((unit) => (
                                            <SelectItem key={unit.id} value={unit.id}>
                                                {unit.name} ({unit.abbreviation})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex items-end gap-3">
                    <FormItem className="flex-1">
                        <FormLabel>Nueva familia</FormLabel>
                        <FormControl>
                            <Input
                                placeholder="Ej: Verduras"
                                value={newFamilyName}
                                onChange={(e) => setNewFamilyName(e.target.value)}
                            />
                        </FormControl>
                    </FormItem>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCreateFamily}
                        disabled={!newFamilyName.trim() || isCreatingFamily}
                    >
                        {isCreatingFamily ? 'Creando...' : 'Crear familia'}
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="stock_current"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Stock Actual</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="stock_min"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Stock Mínimo</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="cost_price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Precio Coste</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                        </>
                    ) : ingredient ? (
                        'Actualizar'
                    ) : (
                        'Crear'
                    )}
                </Button>
            </form>
        </Form>
    );
}
