
import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { eventsService } from '@/services/events.service';
import { format, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DeadlineAlertsProps {
    className?: string;
}

export function DeadlineAlerts({ className }: DeadlineAlertsProps) {
    const { data: events, isLoading } = useQuery({
        queryKey: ['urgent-events'],
        queryFn: async () => {
            const res = await eventsService.getAll();
            const allEvents = Array.isArray(res) ? res : res.data || [];

            // Filter events in the next 7 days that are not CONFIRMED/COMPLETED
            const now = new Date();
            const nextWeek = addDays(now, 7);

            return allEvents.filter((e: any) => {
                const startDate = new Date(e.date_start);
                return isBefore(startDate, nextWeek) && isBefore(now, startDate) && e.status === 'DRAFT';
            });
        }
    });

    if (isLoading) return <div className="h-32 flex items-center justify-center border rounded-lg animate-pulse bg-muted/20">Cargando alertas...</div>;

    const urgentCount = events?.length || 0;

    return (
        <Card className={cn(urgentCount > 0 ? "border-orange-200 shadow-md" : "", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className={urgentCount > 0 ? "text-orange-500" : "text-muted-foreground"} />
                    Alertas de Pedido
                    {urgentCount > 0 && <Badge variant="destructive" className="ml-auto">{urgentCount}</Badge>}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {urgentCount === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No hay eventos próximos que requieran pedidos urgentes.</p>
                    ) : (
                        events?.map((event: any) => (
                            <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors group">
                                <div className="space-y-1">
                                    <h4 className="font-medium text-sm leading-none">{event.name}</h4>
                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(event.date_start), "d 'de' MMMM, HH:mm", { locale: es })}
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    Ver <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
