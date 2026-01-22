import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { preparationsService } from '@/services/preparations.service';
import { ingredientsService } from '@/services/ingredients.service';
import { inventoryService } from '@/services/inventory.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ExpiryScanCapture } from '@/components/preparations/ExpiryScanCapture';

interface IngredientUsage {
    ingredient_id: string;
    unit_id: string;
    quantity_used: string;
}

export default function PreparationBatchesPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [preparationId, setPreparationId] = useState('');
    const [producedAt, setProducedAt] = useState('');
    const [quantityProduced, setQuantityProduced] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [lotCode, setLotCode] = useState('');
    const [locationId, setLocationId] = useState('');
    const [expiringDays, setExpiringDays] = useState('30');
    const [labelCount, setLabelCount] = useState('1');
    const [ingredientsUsed, setIngredientsUsed] = useState<IngredientUsage[]>([
        { ingredient_id: '', unit_id: '', quantity_used: '' },
    ]);

    const { data: preparations = [] } = useQuery({
        queryKey: ['preparations'],
        queryFn: () => preparationsService.list(),
    });

    const { data: batches = [] } = useQuery({
        queryKey: ['preparation-batches', expiringDays],
        queryFn: () =>
            preparationsService.listBatches({
                expiring_in_days: expiringDays ? Number(expiringDays) : undefined,
            }),
    });

    const { data: ingredientsData } = useQuery({
        queryKey: ['ingredients', 'all'],
        queryFn: () => ingredientsService.getAll({ limit: 1000 }),
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['inventory-locations'],
        queryFn: () => inventoryService.listLocations(),
    });

    const ingredients = ingredientsData?.data || [];
    const ingredientMap = useMemo(() => new Map(ingredients.map((ing: any) => [ing.id, ing])), [ingredients]);

    const selectedPreparation = preparations.find((prep) => prep.id === preparationId);

    const createBatchMutation = useMutation({
        mutationFn: () =>
            preparationsService.createBatch(preparationId, {
                produced_at: producedAt,
                quantity_produced: Number(quantityProduced),
                expiry_date: expiryDate || null,
                lot_code: lotCode || null,
                storage_location_id: locationId || null,
                ingredients: ingredientsUsed
                    .filter((item) => item.ingredient_id && item.quantity_used)
                    .map((item) => ({
                        ingredient_id: item.ingredient_id,
                        unit_id: item.unit_id,
                        quantity_used: Number(item.quantity_used),
                    })),
            }),
        onSuccess: () => {
            setQuantityProduced('');
            setProducedAt('');
            setExpiryDate('');
            setLotCode('');
            setLocationId('');
            setIngredientsUsed([{ ingredient_id: '', unit_id: '', quantity_used: '' }]);
            queryClient.invalidateQueries({ queryKey: ['preparation-batches'] });
            toast({ title: 'Lote creado' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo crear el lote', variant: 'destructive' });
        },
    });

    const updateBatchMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) =>
            preparationsService.updateBatch(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['preparation-batches'] });
            toast({ title: 'Lote actualizado' });
        },
    });

    const printLabelsMutation = useMutation({
        mutationFn: async (batchId: string) => {
            const blob = await preparationsService.printLabels(batchId, Number(labelCount) || 1);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `labels-${batchId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        },
    });

    const addIngredientLine = () => {
        setIngredientsUsed((prev) => [...prev, { ingredient_id: '', unit_id: '', quantity_used: '' }]);
    };

    const updateIngredientLine = (index: number, patch: Partial<IngredientUsage>) => {
        setIngredientsUsed((prev) =>
            prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
        );
    };

    const autoExpiry = () => {
        if (!selectedPreparation?.default_shelf_life_days || !producedAt) {
            return;
        }
        const base = new Date(`${producedAt}T00:00:00Z`);
        base.setUTCDate(base.getUTCDate() + selectedPreparation.default_shelf_life_days);
        setExpiryDate(base.toISOString().slice(0, 10));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Lotes de preparacion</h1>
                <p className="text-muted-foreground">Crea lotes y imprime etiquetas.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Nuevo lote</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select value={preparationId} onValueChange={(value) => {
                        setPreparationId(value);
                        autoExpiry();
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Preparacion" />
                        </SelectTrigger>
                        <SelectContent>
                            {preparations.map((prep) => (
                                <SelectItem key={prep.id} value={prep.id}>
                                    {prep.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="date"
                        value={producedAt}
                        onChange={(e) => setProducedAt(e.target.value)}
                        onBlur={autoExpiry}
                    />
                    <Input
                        type="number"
                        placeholder="Cantidad producida"
                        value={quantityProduced}
                        onChange={(e) => setQuantityProduced(e.target.value)}
                    />
                    <Input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        placeholder="Caducidad"
                    />
                    <Input
                        placeholder="Lote (opcional)"
                        value={lotCode}
                        onChange={(e) => setLotCode(e.target.value)}
                    />
                    <Select value={locationId} onValueChange={setLocationId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Ubicacion" />
                        </SelectTrigger>
                        <SelectContent>
                            {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                    {loc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="md:col-span-3 space-y-3">
                        <div className="text-sm font-semibold">Ingredientes usados</div>
                        {ingredientsUsed.map((line, index) => {
                            const ingredient = ingredientMap.get(line.ingredient_id);
                            return (
                                <div key={`${index}-${line.ingredient_id}`} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                    <Select
                                        value={line.ingredient_id}
                                        onValueChange={(value) => {
                                            const selected = ingredientMap.get(value);
                                            updateIngredientLine(index, {
                                                ingredient_id: value,
                                                unit_id: selected?.unit_id || '',
                                            });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Ingrediente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ingredients.map((ing: any) => (
                                                <SelectItem key={ing.id} value={ing.id}>
                                                    {ing.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        placeholder={`Cantidad (${ingredient?.units?.abbreviation || '-'})`}
                                        value={line.quantity_used}
                                        onChange={(e) =>
                                            updateIngredientLine(index, { quantity_used: e.target.value })
                                        }
                                    />
                                    <div className="text-xs text-muted-foreground self-center">
                                        Unidad: {ingredient?.units?.abbreviation || 'N/D'}
                                    </div>
                                </div>
                            );
                        })}
                        <Button type="button" variant="outline" onClick={addIngredientLine}>
                            Agregar ingrediente
                        </Button>
                    </div>

                    <div className="md:col-span-3 flex justify-end">
                        <Button
                            onClick={() => createBatchMutation.mutate()}
                            disabled={!preparationId || !producedAt || !quantityProduced}
                        >
                            Crear lote
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                    <span className="text-sm">Caduca en</span>
                    <Input
                        className="w-24"
                        type="number"
                        value={expiringDays}
                        onChange={(e) => setExpiringDays(e.target.value)}
                    />
                    <span className="text-sm">dias</span>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {batches.map((batch) => (
                    <Card key={batch.id}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>{batch.preparation?.name || batch.preparation_id}</span>
                                <span className="text-sm text-muted-foreground">
                                    Stock: {batch.quantity_current} {batch.preparation?.unit?.abbreviation || ''}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Input
                                type="date"
                                defaultValue={batch.expiry_date || ''}
                                onBlur={(e) =>
                                    updateBatchMutation.mutate({
                                        id: batch.id,
                                        payload: { expiry_date: e.target.value || null },
                                    })
                                }
                            />
                            <Select
                                value={batch.storage_location_id || ''}
                                onValueChange={(value) =>
                                    updateBatchMutation.mutate({
                                        id: batch.id,
                                        payload: { storage_location_id: value || null },
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Ubicacion" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                defaultValue={batch.quantity_current}
                                onBlur={(e) =>
                                    updateBatchMutation.mutate({
                                        id: batch.id,
                                        payload: { quantity_current: Number(e.target.value) },
                                    })
                                }
                            />
                            <Input
                                placeholder="Lote"
                                defaultValue={batch.lot_code || ''}
                                onBlur={(e) =>
                                    updateBatchMutation.mutate({
                                        id: batch.id,
                                        payload: { lot_code: e.target.value || null },
                                    })
                                }
                            />
                            <div className="md:col-span-2">
                                <ExpiryScanCapture
                                    batchId={batch.id}
                                    onConfirm={(date) =>
                                        updateBatchMutation.mutate({
                                            id: batch.id,
                                            payload: { expiry_date: date },
                                        })
                                    }
                                />
                            </div>
                            <div className="md:col-span-3 flex items-center justify-between">
                                <Input
                                    className="w-28"
                                    type="number"
                                    value={labelCount}
                                    onChange={(e) => setLabelCount(e.target.value)}
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => printLabelsMutation.mutate(batch.id)}
                                >
                                    Imprimir etiquetas
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {batches.length === 0 && (
                    <div className="text-sm text-muted-foreground">No hay lotes.</div>
                )}
            </div>
        </div>
    );
}
