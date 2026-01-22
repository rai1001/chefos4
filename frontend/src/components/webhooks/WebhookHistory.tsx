import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WebhookDelivery } from '@/services/webhook.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WebhookHistoryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deliveries: WebhookDelivery[];
    isLoading: boolean;
}

export function WebhookHistory({
    open,
    onOpenChange,
    deliveries,
    isLoading,
}: WebhookHistoryProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Historial de Entregas</DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[500px] w-full pr-4">
                    {isLoading ? (
                        <div className="text-center py-8">Cargando historial...</div>
                    ) : deliveries.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay historial de entregas registrado.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Evento</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Intentos</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deliveries.map((delivery) => (
                                    <TableRow key={delivery.id}>
                                        <TableCell className="text-xs">
                                            {format(new Date(delivery.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{delivery.event_type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    delivery.status === 'success' ? 'default' :
                                                        delivery.status === 'pending' ? 'secondary' : 'destructive'
                                                }
                                            >
                                                {delivery.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{delivery.response_code || '-'}</TableCell>
                                        <TableCell>{delivery.attempt_count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
