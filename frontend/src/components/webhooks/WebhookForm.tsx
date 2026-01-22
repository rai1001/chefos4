import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateWebhookDTO } from '@/services/webhook.service';

interface WebhookFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: CreateWebhookDTO) => Promise<void>;
    initialData?: CreateWebhookDTO;
    isLoading?: boolean;
}

const AVAILABLE_EVENTS = [
    { id: 'inventory.low', label: 'Inventario Bajo' },
    { id: 'po.created', label: 'Orden de Compra Creada' },
    { id: 'po.updated', label: 'Orden de Compra Actualizada' },
    { id: 'test.ping', label: 'Test Ping' },
];

export function WebhookForm({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    isLoading,
}: WebhookFormProps) {
    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CreateWebhookDTO>({
        defaultValues: {
            url: initialData?.url || '',
            events: initialData?.events || [],
            is_active: initialData?.is_active ?? true,
        },
    });

    const selectedEvents = watch('events') || [];

    const handleEventToggle = (eventId: string) => {
        const current = selectedEvents;
        if (current.includes(eventId)) {
            setValue('events', current.filter((e) => e !== eventId));
        } else {
            setValue('events', [...current, eventId]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {initialData ? 'Editar Webhook' : 'Nuevo Webhook'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="url">URL del Endpoint</Label>
                        <Input
                            id="url"
                            placeholder="https://api.tudominio.com/webhooks"
                            {...register('url', {
                                required: 'La URL es requerida',
                                pattern: {
                                    value: /^https?:\/\/.+/,
                                    message: 'Debe ser una URL válida (http/https)',
                                },
                            })}
                        />
                        {errors.url && (
                            <p className="text-sm text-destructive">{errors.url.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Eventos a Suscribir</Label>
                        <div className="space-y-2 border rounded-md p-4">
                            {AVAILABLE_EVENTS.map((event) => (
                                <div key={event.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={event.id}
                                        checked={selectedEvents.includes(event.id)}
                                        onCheckedChange={() => handleEventToggle(event.id)}
                                    />
                                    <Label htmlFor={event.id} className="text-sm font-normal cursor-pointer">
                                        {event.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        {selectedEvents.length === 0 && (
                            <p className="text-sm text-destructive">Selecciona al menos un evento</p>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_active"
                            checked={watch('is_active')}
                            onCheckedChange={(checked: boolean) => setValue('is_active', checked)}
                        />
                        <Label htmlFor="is_active">Activo</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : 'Guardar Webhook'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
