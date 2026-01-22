import { useState } from 'react';
import { Calendar as CalendarIcon, Filter, Layers } from 'lucide-react';
import { ProductionGantt } from '@/components/production/ProductionGantt';
import { Button } from '@/components/ui/button';
import { useEvents } from '@/hooks/useEvents';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function Production() {
    const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
    const { data: events } = useEvents();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Planificación de Producción</h1>
                    <p className="text-muted-foreground">
                        Gestiona el cronograma de cocina y dependencias entre tareas
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <Filter className="mr-2 h-4 w-4" />
                        Filtros
                    </Button>
                    <Button>
                        <Layers className="mr-2 h-4 w-4" />
                        Auto-planificar
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Filtrar por Evento:</span>
                </div>

                <Select
                    value={selectedEventId}
                    onValueChange={(value) => setSelectedEventId(value === 'all' ? undefined : value)}
                >
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Todos los eventos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los eventos</SelectItem>
                        {events?.map((event: any) => (
                            <SelectItem key={event.id} value={event.id}>
                                {event.name} ({new Date(event.date).toLocaleDateString()})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <ProductionGantt eventId={selectedEventId} />
        </div>
    );
}
