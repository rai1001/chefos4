import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { preparationsService } from '@/services/preparations.service';
import { ingredientsService } from '@/services/ingredients.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

export default function PreparationsCatalogPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [unitId, setUnitId] = useState('');
    const [station, setStation] = useState('');
    const [shelfLife, setShelfLife] = useState('');
    const [notes, setNotes] = useState('');

    const { data: preparations = [] } = useQuery({
        queryKey: ['preparations'],
        queryFn: () => preparationsService.list(),
    });

    const { data: ingredientsData } = useQuery({
        queryKey: ['ingredients', 'all'],
        queryFn: () => ingredientsService.getAll({ limit: 1000 }),
    });

    const units = useMemo(() => {
        const map = new Map<string, { id: string; name: string; abbreviation: string }>();
        for (const item of ingredientsData?.data || []) {
            if (item.units) {
                map.set(item.units.id, item.units);
            }
        }
        return Array.from(map.values());
    }, [ingredientsData]);

    const createMutation = useMutation({
        mutationFn: () =>
            preparationsService.create({
                name,
                unit_id: unitId,
                default_shelf_life_days: shelfLife ? Number(shelfLife) : 0,
                station: station || null,
                notes: notes || null,
                active: true,
            }),
        onSuccess: () => {
            setName('');
            setUnitId('');
            setStation('');
            setShelfLife('');
            setNotes('');
            queryClient.invalidateQueries({ queryKey: ['preparations'] });
            toast({ title: 'Preparacion creada' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo crear la preparacion', variant: 'destructive' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) => preparationsService.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['preparations'] });
            toast({ title: 'Preparacion actualizada' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
        },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Preparaciones</h1>
                <p className="text-muted-foreground">Catálogo de produccion interna.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Nueva preparacion</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                        placeholder="Estacion"
                        value={station}
                        onChange={(e) => setStation(e.target.value)}
                    />
                    <Input
                        placeholder="Caducidad por defecto (dias)"
                        type="number"
                        value={shelfLife}
                        onChange={(e) => setShelfLife(e.target.value)}
                    />
                    <div className="md:col-span-2">
                        <Textarea
                            placeholder="Notas"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                        <Button onClick={() => createMutation.mutate()} disabled={!name || !unitId}>
                            Crear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {preparations.map((prep) => (
                    <Card key={prep.id}>
                        <CardHeader>
                            <CardTitle>{prep.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Input
                                defaultValue={prep.name}
                                onBlur={(e) =>
                                    updateMutation.mutate({
                                        id: prep.id,
                                        payload: { name: e.target.value },
                                    })
                                }
                            />
                            <Input
                                defaultValue={prep.station || ''}
                                placeholder="Estacion"
                                onBlur={(e) =>
                                    updateMutation.mutate({
                                        id: prep.id,
                                        payload: { station: e.target.value || null },
                                    })
                                }
                            />
                            <Input
                                defaultValue={prep.default_shelf_life_days || 0}
                                type="number"
                                onBlur={(e) =>
                                    updateMutation.mutate({
                                        id: prep.id,
                                        payload: {
                                            default_shelf_life_days: Number(e.target.value) || 0,
                                        },
                                    })
                                }
                            />
                            <div className="md:col-span-3">
                                <Textarea
                                    defaultValue={prep.notes || ''}
                                    placeholder="Notas"
                                    onBlur={(e) =>
                                        updateMutation.mutate({
                                            id: prep.id,
                                            payload: { notes: e.target.value || null },
                                        })
                                    }
                                />
                            </div>
                            <div className="md:col-span-3 text-xs text-muted-foreground">
                                Unidad: {prep.unit?.abbreviation || prep.unit_id}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {preparations.length === 0 && (
                    <div className="text-sm text-muted-foreground">No hay preparaciones.</div>
                )}
            </div>
        </div>
    );
}
