import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { preparationsService } from '@/services/preparations.service';
import { inventoryService } from '@/services/inventory.service';
import { recipesService } from '@/services/recipes.service';
import { eventsService } from '@/services/events.service';
import { unitsService } from '@/services/units.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ExpiryScanCapture } from '@/components/preparations/ExpiryScanCapture';

type SourceType = 'manual' | 'recipe' | 'event';

export default function PreparationBatchesPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [sourceType, setSourceType] = useState<SourceType>('manual');
    const [recipeId, setRecipeId] = useState('');
    const [eventId, setEventId] = useState('');
    const [name, setName] = useState('');
    const [unitId, setUnitId] = useState('');
    const [producedAt, setProducedAt] = useState('');
    const [quantityProduced, setQuantityProduced] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [lotCode, setLotCode] = useState('');
    const [locationId, setLocationId] = useState('');
    const [expiringDays, setExpiringDays] = useState('30');
    const [labelCount, setLabelCount] = useState('1');

    const { data: batches = [] } = useQuery({
        queryKey: ['preparation-batches', expiringDays],
        queryFn: () =>
            preparationsService.listBatches({
                expiring_in_days: expiringDays ? Number(expiringDays) : undefined,
            }),
    });

    const { data: recipesData } = useQuery({
        queryKey: ['recipes', 'all'],
        queryFn: () => recipesService.getAll(),
    });

    const { data: eventsData } = useQuery({
        queryKey: ['events', 'all'],
        queryFn: () => eventsService.getAll(),
    });

    const { data: units = [] } = useQuery({
        queryKey: ['units'],
        queryFn: () => unitsService.getAll(),
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['inventory-locations'],
        queryFn: () => inventoryService.listLocations(),
    });

    const recipes = recipesData?.data || [];
    const events = eventsData?.data || [];

    const selectedRecipe = useMemo(
        () => recipes.find((item) => item.id === recipeId),
        [recipes, recipeId]
    );
    const selectedEvent = useMemo(
        () => events.find((item) => item.id === eventId),
        [events, eventId]
    );

    const createBatchMutation = useMutation({
        mutationFn: () =>
            preparationsService.createSimpleBatch({
                name,
                unit_id: unitId,
                produced_at: producedAt,
                quantity_produced: Number(quantityProduced),
                expiry_date: expiryDate || null,
                lot_code: lotCode || null,
                storage_location_id: locationId || null,
            }),
        onSuccess: () => {
            setQuantityProduced('');
            setProducedAt('');
            setExpiryDate('');
            setLotCode('');
            setLocationId('');
            setName('');
            setUnitId('');
            setRecipeId('');
            setEventId('');
            setSourceType('manual');
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

    useEffect(() => {
        if (sourceType === 'recipe' && selectedRecipe) {
            setName(selectedRecipe.name);
        }
        if (sourceType === 'event' && selectedEvent) {
            setName(`Restos ${selectedEvent.name}`);
        }
        if (sourceType === 'manual') {
            setRecipeId('');
            setEventId('');
        }
    }, [sourceType, selectedRecipe, selectedEvent]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Preparaciones</h1>
                <p className="text-muted-foreground">Registra preparaciones y genera etiquetas.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Nueva preparacion</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select value={sourceType} onValueChange={(value) => setSourceType(value as SourceType)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Origen" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="recipe">Receta</SelectItem>
                            <SelectItem value="event">Evento (restos)</SelectItem>
                        </SelectContent>
                    </Select>
                    {sourceType === 'recipe' && (
                        <Select value={recipeId} onValueChange={setRecipeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Receta" />
                            </SelectTrigger>
                            <SelectContent>
                                {recipes.map((recipe) => (
                                    <SelectItem key={recipe.id} value={recipe.id}>
                                        {recipe.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {sourceType === 'event' && (
                        <Select value={eventId} onValueChange={setEventId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Evento" />
                            </SelectTrigger>
                            <SelectContent>
                                {events.map((event) => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Input
                        placeholder="Nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Select value={unitId} onValueChange={setUnitId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Unidad" />
                        </SelectTrigger>
                        <SelectContent>
                            {units.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                    {unit.name} ({unit.abbreviation})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="date"
                        value={producedAt}
                        onChange={(e) => setProducedAt(e.target.value)}
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

                    <div className="md:col-span-3 flex justify-end">
                        <Button
                            onClick={() => createBatchMutation.mutate()}
                            disabled={!name || !unitId || !producedAt || !quantityProduced}
                        >
                            Crear preparacion
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
