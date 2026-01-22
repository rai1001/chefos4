import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Activity, History } from 'lucide-react';
import { Webhook } from '@/services/webhook.service';

interface WebhookListProps {
    webhooks: Webhook[];
    isLoading: boolean;
    onEdit: (webhook: Webhook) => void;
    onDelete: (id: string) => void;
    onViewHistory: (webhook: Webhook) => void;
    onTestDispatch: (webhook: Webhook) => void;
}

export function WebhookList({
    webhooks,
    isLoading,
    onEdit,
    onDelete,
    onViewHistory,
    onTestDispatch,
}: WebhookListProps) {
    if (isLoading) {
        return <div className="p-4 text-center">Cargando webhooks...</div>;
    }

    if (webhooks.length === 0) {
        return (
            <div className="p-8 text-center border rounded-lg bg-muted/20">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No hay webhooks configurados</h3>
                <p className="text-sm text-muted-foreground">
                    Crea tu primer webhook para recibir notificaciones de eventos.
                </p>
            </div>
        );
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Eventos</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Secret</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {webhooks.map((webhook) => (
                        <TableRow key={webhook.id}>
                            <TableCell className="font-medium max-w-[300px] truncate" title={webhook.url}>
                                {webhook.url}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {webhook.events.map((event) => (
                                        <Badge key={event} variant="secondary" className="text-xs">
                                            {event}
                                        </Badge>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                                    {webhook.is_active ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                                {webhook.secret.substring(0, 8)}...
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Probar Dispatch"
                                        onClick={() => onTestDispatch(webhook)}
                                    >
                                        <Activity className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Ver Historial"
                                        onClick={() => onViewHistory(webhook)}
                                    >
                                        <History className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(webhook)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => onDelete(webhook.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
