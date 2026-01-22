
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CalendarRange, Clock, Truck } from "lucide-react";
import { suppliersService, Supplier } from "@/services/suppliers.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const DAYS = [
    { value: 1, label: "L" },
    { value: 2, label: "M" },
    { value: 3, label: "X" },
    { value: 4, label: "J" },
    { value: 5, label: "V" },
    { value: 6, label: "S" },
    { value: 7, label: "D" },
];

const supplierSchema = z.object({
    name: z.string().min(2, "Nombre requerido"),
    contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
    contact_phone: z.string().optional(),
    lead_time_days: z.coerce.number().min(0).max(30),
    cut_off_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Formato HH:MM requerido").optional().or(z.literal("")),
    delivery_days: z.array(z.number()).min(1, "Selecciona al menos un día de reparto"),
});

interface SupplierFormProps {
    initialData?: Supplier;
    onSuccess: () => void;
}

export function SupplierForm({ initialData, onSuccess }: SupplierFormProps) {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof supplierSchema>>({
        resolver: zodResolver(supplierSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            contact_email: initialData.contact_email || "",
            contact_phone: initialData.contact_phone || "",
            lead_time_days: initialData.lead_time_days,
            cut_off_time: initialData.cut_off_time || "",
            delivery_days: initialData.delivery_days,
        } : {
            name: "",
            lead_time_days: 2,
            delivery_days: [1, 2, 3, 4, 5],
        }
    });

    const onSubmit = async (data: any) => {
        try {
            const payload = { ...data, cut_off_time: data.cut_off_time || null };
            if (initialData) {
                await suppliersService.update(initialData.id, payload);
                toast({ title: "Proveedor actualizado" });
            } else {
                await suppliersService.create(payload);
                toast({ title: "Proveedor creado" });
            }
            onSuccess();
        } catch (error) {
            toast({ title: "Error", variant: "destructive" });
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
                            <FormLabel>Nombre</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="lead_time_days"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <CalendarRange className="w-4 h-4" /> Lead Time
                                </FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormDescription>Días hábiles de preparación</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="cut_off_time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Hora Límite
                                </FormLabel>
                                <FormControl><Input placeholder="11:00" {...field} /></FormControl>
                                <FormDescription>HH:MM (24h)</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="delivery_days"
                    render={() => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <Truck className="w-4 h-4" /> Días de Reparto
                            </FormLabel>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {DAYS.map((day) => (
                                    <FormField
                                        key={day.value}
                                        control={form.control}
                                        name="delivery_days"
                                        render={({ field }) => {
                                            const isActive = field.value?.includes(day.value);
                                            return (
                                                <Button
                                                    type="button"
                                                    variant={isActive ? "default" : "outline"}
                                                    className={cn(
                                                        "w-10 h-10 p-0 rounded-full transition-all",
                                                        isActive ? "ring-2 ring-primary ring-offset-2" : "text-muted-foreground"
                                                    )}
                                                    onClick={() => {
                                                        const newValue = isActive
                                                            ? field.value.filter((v: number) => v !== day.value)
                                                            : [...(field.value || []), day.value];
                                                        field.onChange(newValue);
                                                    }}
                                                >
                                                    {day.label}
                                                </Button>
                                            );
                                        }}
                                    />
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Proveedor
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
