import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { wasteService } from '@/services/waste.service';
import { WasteStats } from '@/components/waste/WasteStats';
import { CreateWasteModal } from '@/components/waste/CreateWasteModal';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils'; // Assuming formatDateTime exists or use new Date().toLocaleString()

export default function WastePage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Fetch recent logs (reusing getStats or a specific endpoint if needed)
    // For now getting stats includes logs in my mock implementation of backend, but backend implementation returned `data` which was array of logs.
    const { data: logs, isLoading } = useQuery({
        queryKey: ['waste-stats'], // Reusing same key to keep in sync
        queryFn: () => wasteService.getStats()
    });

    const wasteLogs = Array.isArray(logs) ? logs : [];

    // Sort by date desc
    const sortedLogs = [...wasteLogs].sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gestión de Mermas</h2>
                    <p className="text-muted-foreground">
                        Control y análisis de desperdicios y pérdidas de inventario.
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <Plus className="mr-2 h-4 w-4" />
                            Registrar Merma
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Registrar Merma</DialogTitle>
                            <DialogDescription>
                                Registra la salida de inventario por merma. Esta acción descontará el stock.
                            </DialogDescription>
                        </DialogHeader>
                        <CreateWasteModal
                            onSuccess={() => setIsCreateOpen(false)}
                            onCancel={() => setIsCreateOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <WasteStats />

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Ingrediente</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Causa</TableHead>
                            <TableHead className="text-right">Costo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    Cargando...
                                </TableCell>
                            </TableRow>
                        ) : sortedLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No hay registros de merma.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedLogs.map((log: any) => (
                                <TableRow key={log.created_at + log.ingredient_id}> {/* logs might not have id if backend only selects fields, so using composite key */}
                                    <TableCell>{formatDateTime(log.created_at)}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{log.ingredients?.name}</span>
                                            <span className="text-xs text-muted-foreground">{log.ingredients?.units?.abbreviation}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{Math.abs(Number(log.quantity_change))}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                            {log.waste_causes?.name || 'Otro'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-destructive">
                                        {formatCurrency(Number(log.cost_amount || 0))}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
