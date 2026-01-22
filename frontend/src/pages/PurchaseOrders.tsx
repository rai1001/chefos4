import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
// import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'; // Assuming this hook needs to be created
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
    // Temporary mock until hook is created
    const data = { data: [], isLoading: false };
    const isLoading = data.isLoading;


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
                    <p className="text-muted-foreground">
                        Gestiona pedidos a proveedores
                    </p>
                </div>


                <Button className="btn-large">
                    <Plus className="mr-2 h-5 w-5" />
                    Nueva Orden
                </Button>
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
                                    {data?.data?.map((po: any) => (
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
