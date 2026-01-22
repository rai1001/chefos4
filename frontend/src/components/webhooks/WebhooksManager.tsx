import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { WebhookService, Webhook, WebhookDelivery, CreateWebhookDTO } from '@/services/webhook.service';
import { WebhookList } from './WebhookList';
import { WebhookForm } from './WebhookForm';
import { WebhookHistory } from './WebhookHistory';

export function WebhooksManager() {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedWebhook, setSelectedWebhook] = useState<Webhook | undefined>(undefined);
    const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const { toast } = useToast();
    const webhookService = new WebhookService();

    const fetchWebhooks = async () => {
        try {
            setIsLoading(true);
            const data = await webhookService.getAll();
            setWebhooks(data.data || []);
        } catch (error) {
            console.error('Error fetching webhooks:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los webhooks.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const handleCreate = () => {
        setSelectedWebhook(undefined);
        setIsFormOpen(true);
    };

    const handleEdit = (webhook: Webhook) => {
        setSelectedWebhook(webhook);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este webhook?')) return;

        try {
            await webhookService.delete(id);
            toast({
                title: 'Éxito',
                description: 'Webhook eliminado correctamente.',
            });
            fetchWebhooks();
        } catch (error) {
            console.error('Error deleting webhook:', error);
            toast({
                title: 'Error',
                description: 'No se pudo eliminar el webhook.',
                variant: 'destructive',
            });
        }
    };

    const handleSubmit = async (data: CreateWebhookDTO) => {
        try {
            if (selectedWebhook) {
                await webhookService.update(selectedWebhook.id, data);
            } else {
                await webhookService.create(data);
            }
            toast({
                title: 'Éxito',
                description: `Webhook ${selectedWebhook ? 'actualizado' : 'creado'} correctamente.`,
            });
            setIsFormOpen(false);
            fetchWebhooks();
        } catch (error) {
            console.error('Error saving webhook:', error);
            toast({
                title: 'Error',
                description: 'No se pudo guardar el webhook.',
                variant: 'destructive',
            });
        }
    };

    const handleViewHistory = async (webhook: Webhook) => {
        setSelectedWebhook(webhook);
        setIsHistoryOpen(true);
        setIsHistoryLoading(true);
        try {
            const data = await webhookService.getHistory(webhook.id);
            setDeliveries(data.data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
            toast({
                title: 'Error',
                description: 'No se pudo cargar el historial.',
                variant: 'destructive',
            });
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleTestDispatch = async (webhook: Webhook) => {
        try {
            await webhookService.testDispatch(webhook.id);
            toast({
                title: 'Dispatched',
                description: 'Se ha enviado un evento de prueba.',
            });
            // Optionally refresh history if it sends immediately, but usually async.
        } catch (error) {
            console.error('Error dispatching test:', error);
            toast({
                title: 'Error',
                description: 'No se pudo enviar el evento de prueba.',
                variant: 'destructive',
            });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-medium">Webhooks</h2>
                    <p className="text-sm text-muted-foreground">
                        Configura notificaciones automáticas para eventos del sistema.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Webhook
                </Button>
            </div>

            <WebhookList
                webhooks={webhooks}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewHistory={handleViewHistory}
                onTestDispatch={handleTestDispatch}
            />

            <WebhookForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleSubmit}
                initialData={selectedWebhook ? {
                    url: selectedWebhook.url,
                    events: selectedWebhook.events,
                    is_active: selectedWebhook.is_active
                } : undefined}
            />

            <WebhookHistory
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                deliveries={deliveries}
                isLoading={isHistoryLoading}
            />
        </div>
    );
}
