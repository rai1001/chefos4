import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { inventoryService } from '@/services/inventory.service';

export default function InventoryLocations({ embedded = false }: { embedded?: boolean }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [type, setType] = useState('');

    const { data: locations = [] } = useQuery({
        queryKey: ['inventory-locations'],
        queryFn: () => inventoryService.listLocations(),
    });

    const createMutation = useMutation({
        mutationFn: () => inventoryService.createLocation({ name, type: type || null }),
        onSuccess: () => {
            setName('');
            setType('');
            queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
            toast({ title: 'Ubicacion creada' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo crear la ubicacion', variant: 'destructive' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: { name?: string; type?: string | null } }) =>
            inventoryService.updateLocation(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
            toast({ title: 'Ubicacion actualizada' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo actualizar la ubicacion', variant: 'destructive' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => inventoryService.deleteLocation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
            toast({ title: 'Ubicacion eliminada' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo eliminar la ubicacion', variant: 'destructive' });
        },
    });

    return (
        <div className="space-y-6">
            {!embedded && (
                <div>
                    <h1 className="text-3xl font-bold">Ubicaciones</h1>
                    <p className="text-muted-foreground">Gestiona las ubicaciones de almacen.</p>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Nueva ubicacion</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input
                        placeholder="Nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                        placeholder="Tipo (camara, congelador...)"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <Button onClick={() => createMutation.mutate()} disabled={!name}>
                            Crear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {locations.map((location) => (
                    <Card key={location.id}>
                        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3 pt-6">
                            <Input
                                defaultValue={location.name}
                                onBlur={(e) =>
                                    updateMutation.mutate({
                                        id: location.id,
                                        payload: { name: e.target.value },
                                    })
                                }
                            />
                            <Input
                                defaultValue={location.type || ''}
                                onBlur={(e) =>
                                    updateMutation.mutate({
                                        id: location.id,
                                        payload: { type: e.target.value || null },
                                    })
                                }
                            />
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => deleteMutation.mutate(location.id)}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {locations.length === 0 && (
                    <div className="text-sm text-muted-foreground">No hay ubicaciones.</div>
                )}
            </div>
        </div>
    );
}
