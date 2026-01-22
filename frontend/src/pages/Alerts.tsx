import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { inventoryService, InventoryAlert } from '@/services/inventory.service';

const severityVariant: Record<InventoryAlert['severity'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    INFO: 'secondary',
    WARN: 'default',
    CRITICAL: 'destructive',
};

export default function Alerts() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<'OPEN' | 'RESOLVED'>('OPEN');

    const { data: alerts = [] } = useQuery({
        queryKey: ['inventory-alerts', status],
        queryFn: () => inventoryService.listAlerts(status),
    });

    const resolveMutation = useMutation({
        mutationFn: (id: string) => inventoryService.resolveAlert(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
            toast({ title: 'Alerta resuelta' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo resolver la alerta', variant: 'destructive' });
        },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Alertas</h1>
                <p className="text-muted-foreground">Caducidades y stock bajo en inventario.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle>Listado</CardTitle>
                    <Select value={status} onValueChange={(value) => setStatus(value as 'OPEN' | 'RESOLVED')}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="OPEN">Pendientes</SelectItem>
                            <SelectItem value="RESOLVED">Resueltas</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Entidad</TableHead>
                                <TableHead>Severidad</TableHead>
                                <TableHead>Creada</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {alerts.map((alert) => (
                                <TableRow key={alert.id}>
                                    <TableCell>{alert.type}</TableCell>
                                    <TableCell>{alert.entity_type}</TableCell>
                                    <TableCell>
                                        <Badge variant={severityVariant[alert.severity]}>{alert.severity}</Badge>
                                    </TableCell>
                                    <TableCell>{new Date(alert.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        {alert.resolved_at ? (
                                            <span className="text-xs text-muted-foreground">Resuelta</span>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => resolveMutation.mutate(alert.id)}
                                            >
                                                Resolver
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {alerts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                                        No hay alertas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
