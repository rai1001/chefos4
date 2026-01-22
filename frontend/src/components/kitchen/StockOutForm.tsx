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
import { useIngredients } from '@/hooks/useIngredients';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';


const stockOutSchema = z.object({
    ingredient_id: z.string().min(1, 'Selecciona un ingrediente'),
    quantity: z.number().min(0.01, 'Minimo 0.01'),
    notes: z.string().optional(),
});


export function StockOutForm({ onSuccess }: { onSuccess?: () => void }) {
    const { data: ingredients } = useIngredients();

    const form = useForm<z.infer<typeof stockOutSchema>>({
        resolver: zodResolver(stockOutSchema),
        defaultValues: {
            ingredient_id: '',
            quantity: 1,
            notes: '',
        },
    });


    const onSubmit = async (values: z.infer<typeof stockOutSchema>) => {
        console.log('Stock out submitted:', values);
        // Simulating API call
        await new Promise(resolve => setTimeout(resolve, 500));
        onSuccess?.();
    };


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                <FormField
                    control={form.control}
                    name="ingredient_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ingrediente</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Busca ingrediente..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {ingredients?.data?.map((ing: any) => (
                                        <SelectItem key={ing.id} value={ing.id}>
                                            {ing.name} ({ing.units?.abbreviation})
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
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cantidad a retirar</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="h-12 text-lg"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value))}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />


                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas (Opcional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej: Merma, Prueba..." className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />


                <Button type="submit" className="w-full h-12 text-lg font-bold">
                    Confirmar Salida
                </Button>
            </form>
        </Form>
    );
}
