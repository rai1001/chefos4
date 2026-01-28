import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryService, InventoryStockItem } from '@/services/inventory.service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Search, Loader2, PackageOpen } from 'lucide-react';

export default function InventoryStock({ embedded = false }: { embedded?: boolean }) {
    const [search, setSearch] = useState('');

    const { data = [], isLoading } = useQuery({
        queryKey: ['inventory-stock'],
        queryFn: () => inventoryService.listStockSummary(),
    });

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return data;
        return data.filter((item) => item.name.toLowerCase().includes(term));
    }, [data, search]);

    return (
        <div className="space-y-6">
            {!embedded && (
                <div>
                    <h1 className="text-3xl font-bold">Inventario</h1>
                    <p className="text-muted-foreground">Stock disponible y caducidades proximas.</p>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative max-w-md">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar ingrediente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ingrediente</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Precio medio (estimado)</TableHead>
                            <TableHead>Caducidad proxima</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Cargando inventario...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <PackageOpen className="h-8 w-8 opacity-50" />
                                        <p>No se encontró stock disponible.</p>
                                        {search && (
                                            <Button variant="link" onClick={() => setSearch('')}>
                                                Limpiar búsqueda
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && filtered.map((item: InventoryStockItem) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                    {item.stock_current} {item.units?.abbreviation || ''}
                                </TableCell>
                                <TableCell>{formatCurrency(item.cost_price || 0)}</TableCell>
                                <TableCell>{item.next_expiry_date || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
