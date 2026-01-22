
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
    TrendingUp, TrendingDown, Package, ShoppingCart,
    AlertTriangle, DollarSign, Calendar, Plus
} from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeadlineAlerts } from '@/components/dashboard/DeadlineAlerts';
import { EventCalendar } from '@/components/events/EventCalendar';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const resp = await api.get('/analytics/dashboard');
            return resp.data;
        },
        refetchInterval: 300000, // 5 minutes
    });

    if (isLoading) return <div className="p-8">Cargando analíticas...</div>;

    const { kpis, valuation, trends, foodCost } = stats || {};

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Panel de Control</h1>
                    <p className="text-muted-foreground">Vista general de tu operación culinaria</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Plus className="mr-2 h-4 w-4" />Nuevo Pedido</Button>
                    <Button className="btn-large"><Plus className="mr-2 h-5 w-5" />Nuevo Evento</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Urgent Alerts Side/Top */}
                <div className="lg:col-span-1">
                    <DeadlineAlerts />
                </div>

                {/* KPI Overviews */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Valor Inventario</p>
                                    <h3 className="text-2xl font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(kpis?.total_valuation || 0)}</h3>
                                </div>
                                <DollarSign className="h-8 w-8 text-primary opacity-20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-orange-500/5 border-orange-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Stock Bajo Mínimo</p>
                                    <h3 className="text-2xl font-bold">{kpis?.low_stock_count || 0}</h3>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-orange-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-500/5 border-blue-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Pedidos Pendientes</p>
                                    <h3 className="text-2xl font-bold">{kpis?.pending_pos || 0}</h3>
                                </div>
                                <ShoppingCart className="h-8 w-8 text-blue-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Calendar & Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Calendario de Eventos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <EventCalendar />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Valor por Familia</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={valuation}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="total_value"
                                    nameKey="family_name"
                                >
                                    {valuation?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Trends and Food Cost */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-[400px]">
                    <CardHeader>
                        <CardTitle>Tendencias de Consumo</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    tickFormatter={(str) => new Date(str).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="total_quantity"
                                    stroke="#8884d8"
                                    name="Cantidad Consumida"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Análisis de Food Cost (Teórico vs Real)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {foodCost?.slice(0, 3).map((event: any) => (
                                <div key={event.event_name} className="flex flex-col gap-2 p-3 border rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-sm">{event.event_name}</div>
                                        <Badge variant={event.actual_spent > event.theoretical_cost ? 'destructive' : 'default'} className="text-[10px]">
                                            Desviación: {Math.round((event.actual_spent / event.theoretical_cost - 1) * 100)}%
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase">Teórico</p>
                                            <p className="text-sm font-bold text-primary">
                                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(event.theoretical_cost)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase">Real</p>
                                            <p className="text-sm font-bold">
                                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(event.actual_spent || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!foodCost || foodCost.length === 0) && (
                                <p className="text-center text-muted-foreground py-4 text-sm">Sin datos aún.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
