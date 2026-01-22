
import { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEvents } from '@/hooks/useEvents';
import { cn } from '@/lib/utils';

const EVENT_TYPE_STYLES = {
    BANQUET: 'bg-purple-100 text-purple-800 border-purple-200',
    A_LA_CARTE: 'bg-blue-100 text-blue-800 border-blue-200',
    SPORTS_MULTI: 'bg-red-100 text-red-800 border-red-200',
    COFFEE: 'bg-amber-100 text-amber-800 border-amber-200',
    BUFFET: 'bg-green-100 text-green-800 border-green-200',
};

export function EventCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const { data, isLoading } = useEvents({
        start_date: monthStart.toISOString(),
        end_date: monthEnd.toISOString()
    });

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getEventsForDay = (day: Date) => {
        const events = Array.isArray(data) ? data : (data as any)?.data || [];
        return events.filter((event: any) => isSameDay(new Date(event.date_start), day));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoy</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-muted border rounded-lg overflow-hidden">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="bg-muted/50 p-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {d}
                    </div>
                ))}

                {days.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={day.toISOString()} className={cn(
                            "min-h-[120px] p-2 bg-background border-muted transition-colors hover:bg-muted/5",
                            !isSameMonth(day, currentMonth) && "bg-muted/30 text-muted-foreground",
                            isToday && "ring-1 ring-inset ring-primary"
                        )}>
                            <div className={cn(
                                "text-sm font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                                isToday && "bg-primary text-primary-foreground"
                            )}>
                                {format(day, 'd')}
                            </div>

                            <div className="space-y-1">
                                {dayEvents.map((event: any) => {
                                    const isUrgent = (event.pax || 0) > 100;
                                    return (
                                        <Badge
                                            key={event.id}
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start truncate text-[10px] px-1.5 py-0.5 border shadow-sm",
                                                EVENT_TYPE_STYLES[event.event_type as keyof typeof EVENT_TYPE_STYLES] || "bg-secondary text-secondary-foreground",
                                                isUrgent && "border-red-500 ring-1 ring-red-500 bg-red-50"
                                            )}
                                            title={`${event.name} (${event.pax} pax)`}
                                        >
                                            {isUrgent && <AlertCircle className="w-2.5 h-2.5 mr-1 text-red-500 shrink-0" />}
                                            {event.name}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isLoading && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    );
}
