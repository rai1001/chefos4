import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { useProductFamilies } from '@/hooks/useProductFamilies'; // Assuming this hook exists or I'll need to mock/create it
import { Ingredient } from '@/services/ingredients.service';
import { useEffect } from 'react';

// Form Schema
const formSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    family_id: z.string().uuid('Selecciona una familia válida'),
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
    const { data: suppliersResponse } = useSuppliers();
    const { data: families } = useProductFamilies();
    const { data: units } = useUnits();
    const suppliers = Array.isArray(suppliersResponse)
        ? suppliersResponse
        : suppliersResponse?.data ?? [];
    // const { data: families } = useProductFamilies(); // TODO: Implement if missing or use mock

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            family_id: '',
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
                family_id: ingredient.family_id ?? '',
                supplier_id: ingredient.supplier_id ?? '',
                unit_id: ingredient.unit_id ?? '',
                stock_current: ingredient.stock_current ?? 0,
                stock_min: ingredient.stock_min ?? 0,
                cost_price: ingredient.cost_price ?? 0,
            });
        }
    }, [ingredient, form]);

    const onSubmit = (values: FormValues) => {
        if (ingredient) {
            updateMutation.mutate(
                { id: ingredient.id, data: values },
                { onSuccess }
            );
        } else {
            // Hardcode unit_id for now if not in form, or fetch units. 
            // Assuming backend handles it or we pass a default.
            // For MVP, let's assume we need to pass a valid UUID or existing unit.
            // If the schema requires unit_id, we need to add it to the form.
            // Let's assume 'Kg' unit exists or similar. 
            // For safety, I will map the values directly.
            createMutation.mutate(values as any, { onSuccess });
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    {isLoading ? 'Guardando...' : ingredient ? 'Actualizar' : 'Crear'}
                </Button>
            </form>
        </Form>
    );
}
