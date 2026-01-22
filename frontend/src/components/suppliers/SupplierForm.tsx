
import { useEffect } from "react";
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
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useProductFamilies } from "@/hooks/useProductFamilies";

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
    default_family_id: z.string().uuid().optional().or(z.literal("__none__")),
});

interface SupplierFormProps {
    initialData?: Supplier;
    onSuccess: () => void;
}

export function SupplierForm({ initialData, onSuccess }: SupplierFormProps) {
    const { toast } = useToast();
    const { data: families } = useProductFamilies();
    const familyNameById = new Map((families || []).map((family) => [family.id, family.name]));
    const defaultValues = initialData ? {
        name: initialData.name || "",
        contact_email: initialData.contact_email || "",
        contact_phone: initialData.contact_phone || "",
        lead_time_days: initialData.lead_time_days ?? 2,
        cut_off_time: initialData.cut_off_time ? initialData.cut_off_time.slice(0, 5) : "",
        delivery_days: initialData.delivery_days?.length ? initialData.delivery_days : [1, 2, 3, 4, 5],
        default_family_id: initialData.default_family_id || "__none__",
    } : {
        name: "",
        contact_email: "",
        contact_phone: "",
        lead_time_days: 2,
        cut_off_time: "",
        delivery_days: [1, 2, 3, 4, 5],
        default_family_id: "__none__",
    };
    const form = useForm<z.infer<typeof supplierSchema>>({
        resolver: zodResolver(supplierSchema),
        defaultValues,
    });

    useEffect(() => {
        form.reset(defaultValues);
    }, [form, initialData]);

    const onSubmit = async (data: any) => {
        try {
            const cutOff =
                data.cut_off_time && data.cut_off_time.length === 5
                    ? `${data.cut_off_time}:00`
                    : data.cut_off_time || null;
            const payload = {
                ...data,
                cut_off_time: cutOff,
                default_family_id:
                    data.default_family_id && data.default_family_id !== "__none__"
                        ? data.default_family_id
                        : null,
            };
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="contact_email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email (opcional)</FormLabel>
                                <FormControl><Input type="email" placeholder="compras@proveedor.com" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="contact_phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Telefono (opcional)</FormLabel>
                                <FormControl><Input type="tel" placeholder="+34 600 000 000" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="default_family_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Familia por defecto (opcional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <FormDescription>
                                Se usa en importaciones si la fila no trae familia.
                                {field.value && field.value !== "__none__"
                                    ? ` Actual: ${familyNameById.get(field.value) || 'Sin nombre'}.`
                                    : ''}
                            </FormDescription>
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
                                <FormControl>
                                    <Input type="time" step="60" placeholder="11:00" {...field} />
                                </FormControl>
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
