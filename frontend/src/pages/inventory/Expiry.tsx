import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventory.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ExpiryScanCapture } from '@/components/inventory/ExpiryScanCapture';

export default function InventoryExpiry({ embedded = false }: { embedded?: boolean }) {
    const [expiringDays, setExpiringDays] = useState<string>('30');
    const queryClient = useQueryClient();

    const { data: locations = [] } = useQuery({
        queryKey: ['inventory-locations'],
        queryFn: () => inventoryService.listLocations(),
    });

    const { data: batches = [] } = useQuery({
        queryKey: ['inventory-batches', expiringDays],
        queryFn: () =>
            inventoryService.listBatches({
                expiring_in_days: expiringDays ? Number(expiringDays) : undefined,
            }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) =>
            inventoryService.updateBatch(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-batches'] }),
    });

    return (
        <div className="space-y-6">
            {!embedded && (
                <div>
                    <h1 className="text-3xl font-bold">Caducidades</h1>
                    <p className="text-muted-foreground">Gestiona lotes y fechas de caducidad.</p>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Caduca en</span>
                        <Input
                            className="w-24"
                            type="number"
                            value={expiringDays}
                            onChange={(e) => setExpiringDays(e.target.value)}
                        />
                        <span className="text-sm">días</span>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {batches.map((batch) => (
                    <Card key={batch.id}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>{batch.ingredient?.name || batch.ingredient_id}</span>
                                <span className="text-sm text-muted-foreground">
                                    Stock: {batch.quantity_current} {batch.unit?.abbreviation}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Fecha caducidad</div>
                                <Input
                                    type="date"
                                    defaultValue={batch.expiry_date || ''}
                                    onBlur={(e) =>
                                        updateMutation.mutate({
                                            id: batch.id,
                                            payload: { expiry_date: e.target.value || null },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Ubicación</div>
                                <Select
                                    value={batch.storage_location_id || ''}
                                    onValueChange={(val) =>
                                        updateMutation.mutate({
                                            id: batch.id,
                                            payload: { storage_location_id: val || null },
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map((loc) => (
                                            <SelectItem key={loc.id} value={loc.id}>
                                                {loc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Escanear etiqueta</div>
                                <ExpiryScanCapture
                                    batchId={batch.id}
                                    onConfirm={(date) =>
                                        updateMutation.mutate({
                                            id: batch.id,
                                            payload: { expiry_date: date },
                                        })
                                    }
                                />
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
