import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventCalendar } from '@/components/events/EventCalendar';
import { EventForm } from '@/components/events/EventForm';
import { EventImportDialog } from '@/components/events/EventImportDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { eventsService } from '@/services/events.service';

export default function Events() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const { data: selectedEvent, isLoading: isLoadingEvent } = useQuery({
        queryKey: ['event', selectedEventId],
        queryFn: () => eventsService.getById(selectedEventId as string),
        enabled: !!selectedEventId,
    });

    const handleSuccess = () => {
        setIsCreateOpen(false);
        setIsImportOpen(false);
        setIsEditOpen(false);
        setSelectedEventId(null);
        setRefreshKey(prev => prev + 1); // Trick to force calendar refresh
    };

    const handleSelectEvent = (event: any) => {
        setSelectedEventId(event.id);
        setIsEditOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Eventos</h1>
                    <p className="text-muted-foreground">Planifica banquetes, menús y servicios especiales</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" /> Importar
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="btn-large"><Plus className="mr-2 h-5 w-5" />Nuevo Evento</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>Crear Evento</DialogTitle></DialogHeader>
                            <EventForm onSuccess={handleSuccess} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <EventImportDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onSuccess={handleSuccess}
            />

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Editar Evento</DialogTitle></DialogHeader>
                    {isLoadingEvent ? (
                        <div className="py-6 text-sm text-muted-foreground">Cargando evento...</div>
                    ) : (
                        selectedEvent && <EventForm initialData={selectedEvent} onSuccess={handleSuccess} />
                    )}
                </DialogContent>
            </Dialog>

            <EventCalendar key={refreshKey} onSelectEvent={handleSelectEvent} />
        </div>
    );
}
