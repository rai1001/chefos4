import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useSuppliersWithCutoff } from '@/hooks/useSuppliers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function SupplierCountdown() {
    const { data: suppliers } = useSuppliersWithCutoff();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const urgentSuppliers = suppliers?.filter(
        (s) =>
            s.cutoff_status?.is_delivery_day &&
            s.cutoff_status?.minutes_until_cutoff !== null &&
            s.cutoff_status.minutes_until_cutoff > -60 &&
            s.cutoff_status.minutes_until_cutoff < 120
    );

    if (!urgentSuppliers || urgentSuppliers.length === 0) return null;

    return (
        <div className="space-y-2">
            {urgentSuppliers.map((supplier) => {
                const minutes = supplier.cutoff_status!.minutes_until_cutoff!;
                const hours = Math.floor(Math.abs(minutes) / 60);
                const mins = Math.abs(minutes) % 60;
                const isUrgent = minutes > 0 && minutes < 60;
                const hasPassed = minutes < 0;

                return (
                    <Card key={supplier.id} className={cn('border-2', hasPassed && 'border-muted bg-muted/50', isUrgent && 'border-red-500 animate-pulse', !isUrgent && !hasPassed && 'border-yellow-500 bg-yellow-50')}>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Clock className="h-5 w-5" />
                                {supplier.name}
                                {isUrgent && <Badge variant="destructive" className="ml-auto">¡URGENTE!</Badge>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {hasPassed ? (
                                <p className="text-sm text-muted-foreground">⏱️ Corte superado hace {hours}h {mins}min</p>
                            ) : (
                                <p className="text-sm font-medium">
                                    {isUrgent ? (
                                        <><AlertTriangle className="mr-1 inline h-4 w-4" />Quedan <span className="text-xl font-bold">{mins} min</span></>
                                    ) : (
                                        <>Cierra pedido antes de las {supplier.cut_off_time?.slice(0, 5)} <span className="text-muted-foreground">({hours}h {mins}m)</span></>
                                    )}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
