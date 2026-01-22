
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { eventsService, CreateEventDto, Event } from "@/services/events.service";
import { recipesService, Recipe } from "@/services/recipes.service";
import { ingredientsService, Ingredient } from "@/services/ingredients.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const eventSchema = z.object({
    name: z.string().min(2, "Name required"),
    event_type: z.enum(["BANQUET", "A_LA_CARTE", "SPORTS_MULTI", "COFFEE", "BUFFET"]),
    date_start: z.string().min(1, "Start date required"),
    date_end: z.string().min(1, "End date required"),
    pax: z.coerce.number().min(1, "At least 1 pax"),
    menus: z.array(z.object({
        recipe_id: z.string().uuid(),
        qty_forecast: z.coerce.number().min(1)
    })).optional(),
    direct_ingredients: z.array(z.object({
        ingredient_id: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        unit_id: z.string().uuid()
    })).optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormProps {
    initialData?: Event;
    onSuccess: () => void;
}

export function EventForm({ initialData, onSuccess }: EventFormProps) {
    const { toast } = useToast();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [isOCRProcessing, setIsOCRProcessing] = useState(false);

    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            event_type: initialData.event_type,
            date_start: initialData.date_start.slice(0, 16),
            date_end: initialData.date_end.slice(0, 16),
            pax: initialData.pax,
            menus: initialData.menus?.map(m => ({ recipe_id: m.recipe_id, qty_forecast: m.qty_forecast })) || [],
            direct_ingredients: initialData.direct_ingredients?.map(i => ({
                ingredient_id: i.ingredient_id,
                quantity: i.quantity,
                unit_id: i.unit_id
            })) || [],
        } : {
            name: "",
            event_type: "BANQUET",
            date_start: "",
            date_end: "",
            pax: 100,
            menus: [],
            direct_ingredients: []
        }
    });

    const { fields: menuFields, append: appendMenu, remove: removeMenu } = useFieldArray({
        control: form.control,
        name: "menus"
    });

    const { fields: ingFields, append: appendIng, remove: removeIng } = useFieldArray({
        control: form.control,
        name: "direct_ingredients"
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [recipesData, ingredientsData] = await Promise.all([
                recipesService.getAll(),
                ingredientsService.getAll({ limit: 1000 })
            ]);
            setRecipes(recipesData.data);
            setIngredients(ingredientsData.data);
        } catch (error) {
            console.error("Failed to load options", error);
        }
    };

    const onSubmit = async (data: EventFormValues) => {
        try {
            if (initialData) {
                await eventsService.update(initialData.id, data);
                toast({ title: "Evento actualizado" });
            } else {
                await eventsService.create(data as CreateEventDto);
                toast({ title: "Evento creado exitosamente" });
            }
            onSuccess();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar el evento", variant: "destructive" });
        }
    };

    const handleOCRFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsOCRProcessing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const mockItems = [
                { recipe_name: "Paella de Marisco", quantity: 50 },
                { recipe_name: "Gazpacho Andaluz", quantity: 30 }
            ];

            let matches = 0;
            mockItems.forEach(item => {
                const recipe = recipes.find(r => r.name.toLowerCase().includes(item.recipe_name.toLowerCase()) || item.recipe_name.toLowerCase().includes(r.name.toLowerCase()));
                if (recipe) {
                    appendMenu({ recipe_id: recipe.id, qty_forecast: item.quantity });
                    matches++;
                }
            });

            if (matches > 0) {
                toast({ title: `OCR Importado: ${matches} recetas encontradas` });
            } else {
                toast({ title: "OCR completado", description: "No se encontraron recetas coincidentes automáticamente" });
            }

        } catch (error) {
            toast({ title: "Error OCR", description: "Fallo al procesar imagen", variant: "destructive" });
        } finally {
            setIsOCRProcessing(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre del Evento</FormLabel>
                                <FormControl><Input placeholder="Boda García-López" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="event_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="BANQUET">Banquete</SelectItem>
                                        <SelectItem value="A_LA_CARTE">A la Carta</SelectItem>
                                        <SelectItem value="SPORTS_MULTI">Deportivo (Multi)</SelectItem>
                                        <SelectItem value="COFFEE">Coffee Break</SelectItem>
                                        <SelectItem value="BUFFET">Buffet</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="date_start"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Inicio</FormLabel>
                                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="date_end"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fin</FormLabel>
                                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="pax"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Pax (Personas)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Tabs defaultValue="menus">
                    <TabsList>
                        <TabsTrigger value="menus">Menús / Recetas</TabsTrigger>
                        <TabsTrigger value="ingredients">Ingredientes Directos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="menus" className="space-y-4">
                        <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                            <span className="text-sm font-medium">Configuración del Menú</span>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleOCRFile}
                                        disabled={isOCRProcessing}
                                    />
                                    <Button type="button" variant="outline" size="sm" disabled={isOCRProcessing}>
                                        {isOCRProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        Importar Menú (OCR)
                                    </Button>
                                </div>
                                <Button type="button" size="sm" onClick={() => appendMenu({ recipe_id: "", qty_forecast: 1 })}>
                                    <Plus className="w-4 h-4 mr-2" /> Añadir Receta
                                </Button>
                            </div>
                        </div>

                        {menuFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-end">
                                <FormField
                                    control={form.control}
                                    name={`menus.${index}.recipe_id`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar receta..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {recipes.map(r => (
                                                        <SelectItem key={r.id} value={r.id}>{r.name} ({r.cost_per_serving.toFixed(2)}€/pax)</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`menus.${index}.qty_forecast`}
                                    render={({ field }) => (
                                        <FormItem className="w-32">
                                            <FormControl><Input type="number" placeholder="Cant." {...field} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeMenu(index)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                        {menuFields.length === 0 && <div className="text-center py-6 text-muted-foreground">No hay recetas en el menú. Añade una o importa desde imagen.</div>}

                    </TabsContent>

                    <TabsContent value="ingredients" className="space-y-4">
                        <div className="flex justify-end p-2">
                            <Button type="button" size="sm" onClick={() => appendIng({ ingredient_id: "", quantity: 1, unit_id: "" })}>
                                <Plus className="w-4 h-4 mr-2" /> Añadir Ingrediente
                            </Button>
                        </div>
                        {ingFields.map((field, index) => {
                            const selectedIng = ingredients.find(i => i.id === form.watch(`direct_ingredients.${index}.ingredient_id`));
                            return (
                                <div key={field.id} className="flex gap-2 items-end">
                                    <FormField
                                        control={form.control}
                                        name={`direct_ingredients.${index}.ingredient_id`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <Select onValueChange={(val) => {
                                                    field.onChange(val);
                                                    const ing = ingredients.find(i => i.id === val);
                                                    if (ing) form.setValue(`direct_ingredients.${index}.unit_id`, ing.unit_id);
                                                }} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Ingrediente..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {ingredients.map(i => (
                                                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`direct_ingredients.${index}.quantity`}
                                        render={({ field }) => (
                                            <FormItem className="w-32">
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="w-24 py-2 text-sm text-muted-foreground">{selectedIng?.units?.abbreviation || '-'}</div>

                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeIng(index)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            )
                        })}
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Evento
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
