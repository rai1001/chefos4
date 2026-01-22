import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { inventoryService } from '@/services/inventory.service';

type ItemEdit = { counted_qty: number; notes?: string | null };

export default function InventoryCycleCounts() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [locationId, setLocationId] = useState<string | undefined>();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});

    const { data: locations = [] } = useQuery({
        queryKey: ['inventory-locations'],
        queryFn: () => inventoryService.listLocations(),
    });

    const { data: counts = [] } = useQuery({
        queryKey: ['inventory-cycle-counts'],
        queryFn: () => inventoryService.listCycleCounts(),
    });

    const { data: countDetail } = useQuery({
        queryKey: ['inventory-cycle-count', selectedId],
        queryFn: () => inventoryService.getCycleCount(selectedId!),
        enabled: Boolean(selectedId),
    });

    const createMutation = useMutation({
        mutationFn: () => inventoryService.createCycleCount({ name, location_id: locationId || null }),
        onSuccess: (count) => {
            setName('');
            setLocationId(undefined);
            setSelectedId(count.id);
            setItemEdits({});
            queryClient.invalidateQueries({ queryKey: ['inventory-cycle-counts'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-cycle-count', count.id] });
            toast({ title: 'Recuento creado' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo crear el recuento', variant: 'destructive' });
        },
    });

    const updateItemsMutation = useMutation({
        mutationFn: (payload: { id: string; items: { id: string; counted_qty: number; notes?: string | null }[] }) =>
            inventoryService.updateCycleCountItems(payload.id, payload.items),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-cycle-count', selectedId] });
            setItemEdits({});
            toast({ title: 'Recuento actualizado' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo actualizar el recuento', variant: 'destructive' });
        },
    });

    const completeMutation = useMutation({
        mutationFn: (id: string) => inventoryService.completeCycleCount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-cycle-counts'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-cycle-count', selectedId] });
            toast({ title: 'Recuento completado' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo completar el recuento', variant: 'destructive' });
        },
    });

    const pendingItems = useMemo(() => {
        if (!countDetail?.items) return [];
        return countDetail.items.map((item) => {
            const edit = itemEdits[item.id];
            return {
                ...item,
                counted_qty: edit?.counted_qty ?? item.counted_qty,
                notes: edit?.notes ?? item.notes,
            };
        });
    }, [countDetail, itemEdits]);

    const hasEdits = Object.keys(itemEdits).length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Recuentos</h1>
                <p className="text-muted-foreground">Crea recuentos cíclicos y ajusta el stock.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Nuevo recuento</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input
                        placeholder="Nombre del recuento"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Select value={locationId} onValueChange={setLocationId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Ubicacion (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                            {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                    {loc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex justify-end">
                        <Button onClick={() => createMutation.mutate()} disabled={!name}>
                            Crear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Recuentos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {counts.map((count) => (
                            <button
                                key={count.id}
                                type="button"
                                onClick={() => setSelectedId(count.id)}
                                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                                    selectedId === count.id ? 'border-primary' : 'border-border'
                                }`}
                            >
                                <div className="text-sm font-medium">{count.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {count.status} · {new Date(count.created_at).toLocaleDateString()}
                                </div>
                            </button>
                        ))}
                        {counts.length === 0 && (
                            <div className="text-sm text-muted-foreground">No hay recuentos.</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <CardTitle>Detalle</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                disabled={!selectedId || !hasEdits}
                                onClick={() =>
                                    updateItemsMutation.mutate({
                                        id: selectedId!,
                                        items: Object.entries(itemEdits).map(([id, edit]) => ({
                                            id,
                                            counted_qty: edit.counted_qty,
                                            notes: edit.notes,
                                        })),
                                    })
                                }
                            >
                                Guardar cambios
                            </Button>
                            <Button
                                disabled={!selectedId || countDetail?.status === 'COMPLETED'}
                                onClick={() => selectedId && completeMutation.mutate(selectedId)}
                            >
                                Completar
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!countDetail && (
                            <div className="text-sm text-muted-foreground">
                                Selecciona un recuento para ver sus lineas.
                            </div>
                        )}
                        {countDetail && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ingrediente</TableHead>
                                        <TableHead>Lote</TableHead>
                                        <TableHead>Esperado</TableHead>
                                        <TableHead>Contado</TableHead>
                                        <TableHead>Notas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.ingredient?.name || item.ingredient_id}</TableCell>
                                            <TableCell>{item.batch?.lot_code || item.batch_id || '-'}</TableCell>
                                            <TableCell>{item.expected_qty}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={item.counted_qty}
                                                    onChange={(e) =>
                                                        setItemEdits((prev) => ({
                                                            ...prev,
                                                            [item.id]: {
                                                                counted_qty: Number(e.target.value),
                                                                notes: prev[item.id]?.notes ?? item.notes ?? null,
                                                            },
                                                        }))
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={item.notes || ''}
                                                    onChange={(e) =>
                                                        setItemEdits((prev) => ({
                                                            ...prev,
                                                            [item.id]: {
                                                                counted_qty: prev[item.id]?.counted_qty ?? item.counted_qty,
                                                                notes: e.target.value || null,
                                                            },
                                                        }))
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {pendingItems.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-sm text-muted-foreground">
                                                No hay lineas para este recuento.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
