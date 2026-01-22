import { useQuery } from '@tanstack/react-query';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend
} from 'recharts';
import {
    TrendingUp,
    TrendingDown,
    Package,
    ShoppingCart,
    AlertTriangle,
    DollarSign,
    Calendar,
    Plus
} from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeadlineAlerts } from '@/components/dashboard/DeadlineAlerts';
import { EventCalendar } from '@/components/events/EventCalendar';

const COLORS = ['#f4c025', '#7cc97c', '#ff7a5a', '#f7c948', '#76b2ff'];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

const formatDateLabel = () =>
    new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dias';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
};

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
    const totalValuation = kpis?.total_valuation || 0;
    const lowStockCount = kpis?.low_stock_count || 0;
    const pendingPos = kpis?.pending_pos || 0;
    const familyCount = valuation?.length || 0;
    const featuredEvent = foodCost?.[0];

    const activityItems = [
        {
            id: 'low-stock',
            title: lowStockCount > 0 ? `${lowStockCount} items con stock bajo` : 'Stock saludable',
            subtitle: lowStockCount > 0 ? 'Revisar reposicion recomendada' : 'Sin alertas criticas hoy',
            tone: lowStockCount > 0 ? 'warning' : 'ok',
        },
        {
            id: 'pending-pos',
            title: `${pendingPos} pedidos pendientes`,
            subtitle: pendingPos > 0 ? 'Compras en curso' : 'Sin pedidos abiertos',
            tone: pendingPos > 0 ? 'info' : 'ok',
        },
        {
            id: 'event',
            title: featuredEvent?.event_name ? `Evento: ${featuredEvent.event_name}` : 'Eventos en control',
            subtitle: featuredEvent?.event_name ? 'Revisar desviaciones de coste' : 'Sin incidencias nuevas',
            tone: featuredEvent?.event_name ? 'alert' : 'ok',
        },
    ];

    return (
        <div className="space-y-8 font-['Work_Sans'] text-white">
            <section className="relative overflow-hidden rounded-3xl border border-[#2f2a1b] bg-[#1a170f]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,192,37,0.15),transparent_45%),linear-gradient(120deg,rgba(39,34,22,0.9),rgba(20,18,12,0.6))]" />
                <div className="relative p-6 md:p-10">
                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.25em] text-[#f4c025]">{formatDateLabel()}</p>
                            <h1 className="text-3xl md:text-4xl font-semibold">Panel de Control</h1>
                            <p className="text-sm md:text-base text-[#c9c1a9]">
                                {getGreeting()}, equipo. Aqui teneis el pulso de la operacion.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button className="bg-[#f4c025] text-[#1c170b] hover:bg-[#ffd766]">
                                <Plus className="mr-2 h-4 w-4" />Registrar factura
                            </Button>
                            <Button
                                variant="outline"
                                className="border-[#3b331f] bg-transparent text-white hover:bg-[#2a2416]"
                            >
                                <Calendar className="mr-2 h-4 w-4" />Nuevo evento
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold tracking-wide text-[#f4c025]">FINANZAS</h2>
                            <span className="text-xs uppercase text-[#9a9074]">Proyeccion en tiempo real</span>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="border-[#2f2a1b] bg-[#201c12] text-white shadow-[0_15px_35px_rgba(0,0,0,0.35)]">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs uppercase text-[#9a9074]">Valor Inventario</p>
                                            <h3 className="text-3xl font-semibold">{formatCurrency(totalValuation)}</h3>
                                            <p className="mt-2 text-xs text-[#b9ae92]">Actualizado hace 15m</p>
                                        </div>
                                        <div className="rounded-full bg-[#2a2518] p-3">
                                            <DollarSign className="h-6 w-6 text-[#f4c025]" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-[#2f2a1b] bg-[#201c12] text-white shadow-[0_15px_35px_rgba(0,0,0,0.35)]">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs uppercase text-[#9a9074]">Stock Bajo</p>
                                            <h3 className="text-3xl font-semibold">{lowStockCount}</h3>
                                            <div className="mt-2 flex items-center gap-2 text-xs">
                                                <AlertTriangle className="h-4 w-4 text-[#ff7a5a]" />
                                                <span className="text-[#ffb39e]">Revision recomendada</span>
                                            </div>
                                        </div>
                                        <div className="rounded-full bg-[#2a2518] p-3">
                                            <Package className="h-6 w-6 text-[#ff7a5a]" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold tracking-wide text-white">OPERACIONES</h2>
                            <Button variant="ghost" className="text-[#f4c025] hover:text-[#ffd766]">
                                Ver reporte completo
                            </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="border-[#2f2a1b] bg-[#201c12] text-white transition hover:border-[#f4c025]/40">
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="rounded-lg bg-[#2a2518] p-2">
                                            <ShoppingCart className="h-4 w-4 text-[#f4c025]" />
                                        </div>
                                        <Badge className="bg-[#f4c025]/15 text-[#f4c025]">En curso</Badge>
                                    </div>
                                    <p className="mt-4 text-xs uppercase text-[#9a9074]">Pedidos pendientes</p>
                                    <p className="text-2xl font-semibold">{pendingPos}</p>
                                </CardContent>
                            </Card>
                            <Card className="border-[#2f2a1b] bg-[#201c12] text-white transition hover:border-[#7cc97c]/40">
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="rounded-lg bg-[#2a2518] p-2">
                                            <TrendingUp className="h-4 w-4 text-[#7cc97c]" />
                                        </div>
                                        <Badge className="bg-[#7cc97c]/15 text-[#7cc97c]">Activas</Badge>
                                    </div>
                                    <p className="mt-4 text-xs uppercase text-[#9a9074]">Familias activas</p>
                                    <p className="text-2xl font-semibold">{familyCount}</p>
                                </CardContent>
                            </Card>
                            <Card className="border-[#2f2a1b] bg-[#201c12] text-white transition hover:border-[#76b2ff]/40">
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="rounded-lg bg-[#2a2518] p-2">
                                            <TrendingDown className="h-4 w-4 text-[#76b2ff]" />
                                        </div>
                                        <Badge className="bg-[#76b2ff]/15 text-[#76b2ff]">Eventos</Badge>
                                    </div>
                                    <p className="mt-4 text-xs uppercase text-[#9a9074]">Costes analizados</p>
                                    <p className="text-2xl font-semibold">{foodCost?.length || 0}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <DeadlineAlerts className="border-[#2f2a1b] bg-[#201c12] text-white" />
                    <Card className="border-[#2f2a1b] bg-[#201c12] text-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {activityItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-start gap-3 rounded-lg border border-[#2a2518] bg-[#1b170f] p-3"
                                >
                                    <div
                                        className={
                                            item.tone === 'warning'
                                                ? 'mt-1 h-2 w-2 rounded-full bg-[#ff7a5a]'
                                                : item.tone === 'alert'
                                                    ? 'mt-1 h-2 w-2 rounded-full bg-[#f4c025]'
                                                    : 'mt-1 h-2 w-2 rounded-full bg-[#7cc97c]'
                                        }
                                    />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">{item.title}</p>
                                        <p className="text-xs text-[#9a9074]">{item.subtitle}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 border-[#2f2a1b] bg-[#201c12] text-white">
                    <CardHeader>
                        <CardTitle className="text-lg">Calendario de Eventos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <EventCalendar />
                    </CardContent>
                </Card>
                <Card className="border-[#2f2a1b] bg-[#201c12] text-white">
                    <CardHeader>
                        <CardTitle className="text-lg">Valor por Familia</CardTitle>
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
                                    formatter={(value: any) => formatCurrency(value)}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-[#2f2a1b] bg-[#201c12] text-white">
                    <CardHeader>
                        <CardTitle className="text-lg">Tendencias de Consumo</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2f2a1b" />
                                <XAxis
                                    dataKey="day"
                                    tickFormatter={(str) =>
                                        new Date(str).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                                    }
                                    stroke="#9a9074"
                                />
                                <YAxis stroke="#9a9074" />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="total_quantity"
                                    stroke="#76b2ff"
                                    name="Cantidad Consumida"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-[#2f2a1b] bg-[#201c12] text-white">
                    <CardHeader>
                        <CardTitle className="text-lg">Analisis de Food Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {foodCost?.slice(0, 3).map((event: any) => (
                                <div key={event.event_name} className="rounded-xl border border-[#2a2518] bg-[#1b170f] p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-semibold">{event.event_name}</div>
                                        <Badge
                                            className={
                                                event.actual_spent > event.theoretical_cost
                                                    ? 'bg-[#ff7a5a]/20 text-[#ff7a5a]'
                                                    : 'bg-[#7cc97c]/20 text-[#7cc97c]'
                                            }
                                        >
                                            {Math.round((event.actual_spent / event.theoretical_cost - 1) * 100)}%
                                        </Badge>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <p className="uppercase text-[#9a9074]">Teorico</p>
                                            <p className="text-sm font-semibold text-[#f4c025]">
                                                {formatCurrency(event.theoretical_cost)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="uppercase text-[#9a9074]">Real</p>
                                            <p className="text-sm font-semibold">
                                                {formatCurrency(event.actual_spent || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!foodCost || foodCost.length === 0) && (
                                <p className="text-center text-sm text-[#9a9074] py-6">Sin datos aun.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
