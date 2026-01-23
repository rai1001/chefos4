import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, FileDown } from 'lucide-react';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useEvents } from '@/hooks/useEvents';
import { reportsService } from '@/services/reports.service';
import { eventsService } from '@/services/events.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';


const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    PARTIAL: 'bg-yellow-100 text-yellow-800',
    RECEIVED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
};


export default function PurchaseOrders() {
    const [status, setStatus] = useState('DRAFT');
    const [selectedEventId, setSelectedEventId] = useState('none');
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: ordersData, isLoading } = usePurchaseOrders({ status });
    const { data: events = [] } = useEvents();

    const generateMutation = useMutation({
        mutationFn: async () => {
            if (selectedEventId === 'none') {
                throw new Error('Selecciona un evento');
            }
            return eventsService.generatePurchaseOrders(selectedEventId);
        },
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            toast({
                title: 'Pedidos generados',
                description: `${result?.total_pos || 0} pedidos creados.`,
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error al generar pedidos',
                description: error?.message || error?.response?.data?.error || 'Error desconocido',
                variant: 'destructive',
            });
        },
    });


    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
                    <p className="text-muted-foreground">
                        Gestiona pedidos a proveedores
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => reportsService.downloadPurchaseOrdersPDF()}
                    >
                        <FileDown className="mr-2 h-4 w-4" />
                        Descargar PDF compras
                    </Button>
                    <Button className="btn-large">
                        <Plus className="mr-2 h-5 w-5" />
                        Nueva Orden
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-sm font-semibold">Generar pedidos desde evento</h2>
                        <p className="text-xs text-muted-foreground">
                            Calcula necesidades por pax y agrupa por proveedor.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="w-[260px]">
                                <SelectValue placeholder="Selecciona evento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Selecciona evento</SelectItem>
                                {events.map((event) => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.name} · {formatDate(event.date_start)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={() => generateMutation.mutate()}
                            disabled={selectedEventId === 'none' || generateMutation.isPending}
                        >
                            {generateMutation.isPending ? 'Generando...' : 'Generar pedidos'}
                        </Button>
                    </div>
                </div>
            </div>


            <Tabs value={status} onValueChange={setStatus}>
                <TabsList>
                    <TabsTrigger value="DRAFT">Borradores</TabsTrigger>
                    <TabsTrigger value="SENT">Enviadas</TabsTrigger>
                    <TabsTrigger value="RECEIVED">Recibidas</TabsTrigger>
                </TabsList>


                <TabsContent value={status} className="mt-6">
                    {isLoading ? (
                        <div>Cargando...</div>
                    ) : (
                        <div className="rounded-md border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nº Orden</TableHead>
                                        <TableHead>Proveedor</TableHead>
                                        <TableHead>Evento</TableHead>
                                        <TableHead>Fecha Pedido</TableHead>
                                        <TableHead>Entrega Estimada</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ordersData?.data?.map((po: any) => (
                                        <TableRow key={po.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    {po.id.slice(0, 8)}
                                                </div>
                                            </TableCell>
                                            <TableCell>{po.supplier?.name || '-'}</TableCell>
                                            <TableCell>{po.event?.name || '-'}</TableCell>
                                            <TableCell>{formatDate(po.order_date)}</TableCell>
                                            <TableCell>
                                                {po.delivery_date_estimated
                                                    ? formatDate(po.delivery_date_estimated)
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_COLORS[po.status]}>
                                                    {po.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {formatCurrency(po.total_cost || 0)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">
                                                    Ver Detalles
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
