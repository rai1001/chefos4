import { useQuery } from '@tanstack/react-query';
import { wasteService } from '@/services/waste.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Loader2, TrendingDown, DollarSign } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

export function WasteStats() {
    // Get stats for current month
    // In a real app, we'd have a date picker. For now, defaulting to "all time" or handled by backend defaults if params missing.
    // Let's rely on backend to return what we need or add simple defaults.
    const { data: statsData, isLoading } = useQuery({
        queryKey: ['waste-stats'],
        queryFn: () => wasteService.getStats()
    });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    const logs = statsData || [];

    // Aggregations
    // Aggregations
    const totalCost = logs.reduce((sum: number, log: any) => sum + Number(log.cost_amount || 0), 0);
    // Removed unused totalQuantity

    // By Cause
    const byCause = logs.reduce((acc: any, log: any) => {
        const cause = log.waste_causes?.name || 'Desconocido';
        acc[cause] = (acc[cause] || 0) + Number(log.cost_amount || 0);
        return acc;
    }, {});
    const byCauseData = Object.entries(byCause).map(([name, value]) => ({ name, value }));

    // By Ingredient (Top 5)
    const byIngredient = logs.reduce((acc: any, log: any) => {
        const name = log.ingredients?.name || 'Desconocido';
        acc[name] = (acc[name] || 0) + Number(log.cost_amount || 0);
        return acc;
    }, {});
    const byIngredientData = Object.entries(byIngredient)
        .map(([name, value]) => ({ name, value }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 5);


    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Costo Total Mermas</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">${totalCost.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Valor total perdido</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{logs.length}</div>
                        <p className="text-xs text-muted-foreground">Registros de merma</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Mermas por Causa (Valor)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={byCauseData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {byCauseData.map((_entry: any, index: any) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Top 5 Ingredientes (Costo)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={byIngredientData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: any) => `$${value}`} />
                                    <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
