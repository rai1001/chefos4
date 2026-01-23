import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { inventoryService } from '@/services/inventory.service';
import { ingredientsService } from '@/services/ingredients.service';

const movementOptions = [
    { label: 'Salida', value: 'OUT' },
    { label: 'Merma', value: 'WASTE' },
    { label: 'Ajuste', value: 'ADJUSTMENT' },
];

export default function InventoryStockOut({ embedded = false }: { embedded?: boolean }) {
    const { toast } = useToast();
    const [barcode, setBarcode] = useState('');
    const [ingredientId, setIngredientId] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [movementType, setMovementType] = useState<'OUT' | 'WASTE' | 'ADJUSTMENT'>('OUT');
    const [notes, setNotes] = useState('');
    const [productionOrderId, setProductionOrderId] = useState('');
    const [saveBarcode, setSaveBarcode] = useState(false);
    const [lastResult, setLastResult] = useState<{ movement_id: string; batches: any[] } | null>(null);

    const { data: ingredientsData } = useQuery({
        queryKey: ['ingredients', 'all'],
        queryFn: () => ingredientsService.getAll({ limit: 1000 }),
    });

    const ingredients = ingredientsData?.data || [];
    const ingredientMap = useMemo(
        () => new Map(ingredients.map((ingredient: any) => [ingredient.id, ingredient])),
        [ingredients]
    );

    const stockOutMutation = useMutation({
        mutationFn: () =>
            inventoryService.stockOut({
                barcode: barcode || undefined,
                ingredient_id: ingredientId || undefined,
                quantity: Number(quantity),
                movement_type: movementType,
                notes: notes || undefined,
                production_order_id: productionOrderId || undefined,
                save_barcode: saveBarcode,
            }),
        onSuccess: (data) => {
            setLastResult(data);
            toast({ title: 'Salida registrada', description: `Movimiento ${data.movement_id}` });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo registrar la salida', variant: 'destructive' });
        },
    });

    const onSubmit = () => {
        setLastResult(null);
        stockOutMutation.mutate();
    };

    return (
        <div className="space-y-6">
            {!embedded && (
                <div>
                    <h1 className="text-3xl font-bold">Salidas de almacen</h1>
                    <p className="text-muted-foreground">Escanea un codigo o selecciona un ingrediente.</p>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Escaneo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <BarcodeScanner
                        onDetected={(code) => {
                            setBarcode(code);
                        }}
                    />
                    <Input
                        placeholder="Codigo de barras"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Detalles de salida</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Ingrediente (manual)</div>
                        <Select value={ingredientId} onValueChange={setIngredientId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar ingrediente..." />
                            </SelectTrigger>
                            <SelectContent>
                                {ingredients.map((ingredient: any) => (
                                    <SelectItem key={ingredient.id} value={ingredient.id}>
                                        {ingredient.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {ingredientId && (
                            <div className="mt-2 text-xs text-muted-foreground">
                                Unidad: {ingredientMap.get(ingredientId)?.units?.abbreviation || 'N/D'}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Cantidad</div>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>

                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Tipo de movimiento</div>
                        <Select value={movementType} onValueChange={(val) => setMovementType(val as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                {movementOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Orden de produccion (opcional)</div>
                        <Input
                            value={productionOrderId}
                            onChange={(e) => setProductionOrderId(e.target.value)}
                            placeholder="ID de orden"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <div className="text-xs text-muted-foreground mb-1">Notas</div>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2">
                        <input
                            id="save-barcode"
                            type="checkbox"
                            className="h-4 w-4"
                            checked={saveBarcode}
                            onChange={(e) => setSaveBarcode(e.target.checked)}
                        />
                        <label htmlFor="save-barcode" className="text-sm">
                            Guardar barcode en ingrediente seleccionado si falta
                        </label>
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                        <Button onClick={onSubmit} disabled={stockOutMutation.isPending}>
                            Registrar salida
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {lastResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>Consumo FEFO</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div>Movimiento: {lastResult.movement_id}</div>
                        {lastResult.batches.length === 0 && (
                            <div className="text-muted-foreground">No hay trazas de lotes.</div>
                        )}
                        {lastResult.batches.map((batch: any) => (
                            <div key={batch.batch_id} className="flex justify-between">
                                <span>
                                    Lote {batch.batch?.lot_code || batch.batch_id.slice(0, 6)}
                                </span>
                                <span>{batch.quantity}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
