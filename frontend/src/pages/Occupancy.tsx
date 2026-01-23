import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OccupancyImportDialog } from '@/components/occupancy/OccupancyImportDialog';
import { occupancyService } from '@/services/occupancy.service';

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

export default function OccupancyPage() {
    const [startDate, setStartDate] = useState(monthStart);
    const [endDate, setEndDate] = useState(monthEnd);
    const [isForecastOpen, setIsForecastOpen] = useState(false);
    const [isActualOpen, setIsActualOpen] = useState(false);

    const { data: rows = [], refetch } = useQuery({
        queryKey: ['occupancy', startDate, endDate],
        queryFn: () => occupancyService.list({ start_date: startDate, end_date: endDate }),
    });

    const totals = useMemo(() => {
        return rows.reduce(
            (acc, row) => {
                acc.breakfasts_forecast += row.breakfasts_forecast || 0;
                acc.lunches_forecast += row.lunches_forecast || 0;
                acc.dinners_forecast += row.dinners_forecast || 0;
                acc.breakfasts_actual += row.breakfasts_actual || 0;
                acc.lunches_actual += row.lunches_actual || 0;
                acc.dinners_actual += row.dinners_actual || 0;
                return acc;
            },
            {
                breakfasts_forecast: 0,
                lunches_forecast: 0,
                dinners_forecast: 0,
                breakfasts_actual: 0,
                lunches_actual: 0,
                dinners_actual: 0,
            }
        );
    }, [rows]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Ocupacion y Servicios</h1>
                    <p className="text-muted-foreground">Prevision vs real de desayunos, comidas y cenas.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsForecastOpen(true)}>
                        Importar previsiones
                    </Button>
                    <Button onClick={() => setIsActualOpen(true)}>
                        Importar reales
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Rango</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3">
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <span className="text-sm text-muted-foreground">a</span>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    <Button variant="outline" onClick={() => refetch()}>Actualizar</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Servicios por dia</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Desayunos Prev.</TableHead>
                                <TableHead>Desayunos Real</TableHead>
                                <TableHead>Delta</TableHead>
                                <TableHead>Comidas Prev.</TableHead>
                                <TableHead>Comidas Real</TableHead>
                                <TableHead>Delta</TableHead>
                                <TableHead>Cenas Prev.</TableHead>
                                <TableHead>Cenas Real</TableHead>
                                <TableHead>Delta</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.service_date}</TableCell>
                                    <TableCell>{row.breakfasts_forecast}</TableCell>
                                    <TableCell>{row.breakfasts_actual}</TableCell>
                                    <TableCell>{row.breakfasts_actual - row.breakfasts_forecast}</TableCell>
                                    <TableCell>{row.lunches_forecast}</TableCell>
                                    <TableCell>{row.lunches_actual}</TableCell>
                                    <TableCell>{row.lunches_actual - row.lunches_forecast}</TableCell>
                                    <TableCell>{row.dinners_forecast}</TableCell>
                                    <TableCell>{row.dinners_actual}</TableCell>
                                    <TableCell>{row.dinners_actual - row.dinners_forecast}</TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-sm text-muted-foreground">
                                        No hay datos en el rango seleccionado.
                                    </TableCell>
                                </TableRow>
                            )}
                            {rows.length > 0 && (
                                <TableRow>
                                    <TableCell className="font-medium">Totales</TableCell>
                                    <TableCell>{totals.breakfasts_forecast}</TableCell>
                                    <TableCell>{totals.breakfasts_actual}</TableCell>
                                    <TableCell>{totals.breakfasts_actual - totals.breakfasts_forecast}</TableCell>
                                    <TableCell>{totals.lunches_forecast}</TableCell>
                                    <TableCell>{totals.lunches_actual}</TableCell>
                                    <TableCell>{totals.lunches_actual - totals.lunches_forecast}</TableCell>
                                    <TableCell>{totals.dinners_forecast}</TableCell>
                                    <TableCell>{totals.dinners_actual}</TableCell>
                                    <TableCell>{totals.dinners_actual - totals.dinners_forecast}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <OccupancyImportDialog
                open={isForecastOpen}
                onOpenChange={setIsForecastOpen}
                importType="forecast"
                onSuccess={() => { setIsForecastOpen(false); refetch(); }}
            />
            <OccupancyImportDialog
                open={isActualOpen}
                onOpenChange={setIsActualOpen}
                importType="actual"
                onSuccess={() => { setIsActualOpen(false); refetch(); }}
            />
        </div>
    );
}
