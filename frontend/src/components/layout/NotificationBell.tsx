import { useEffect } from 'react';
import { Bell, Check, Inbox } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { supabase } from '@/config/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function NotificationBell() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const organizationId = (user as any)?.organization_id || (user as any)?.organizationIds?.[0];

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications', organizationId],
        queryFn: async () => {
            const resp = await api.get('/notifications');
            return resp.data.data;
        },
        enabled: !!organizationId,
    });

    const unreadCount = notifications.filter((n: any) => !n.is_read).length;

    const markRead = useMutation({
        mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const markAllRead = useMutation({
        mutationFn: () => api.post('/notifications/read-all'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    // Real-time Subscription
    useEffect(() => {
        if (!organizationId) return;

        const channel = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `organization_id=eq.${organizationId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [organizationId, queryClient]);

    const handleNotificationClick = (notification: any) => {
        if (!notification.is_read) {
            markRead.mutate(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Abrir notificaciones">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] animate-in zoom-in"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[380px] p-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg">Notificaciones</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => markAllRead.mutate()}
                        >
                            <Check className="mr-1 h-3 w-3" />
                            Marcar todas como leídas
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <Inbox className="h-10 w-10 mb-2 opacity-20" />
                            <p>No tienes notificaciones</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((n: any) => (
                                <DropdownMenuItem
                                    key={n.id}
                                    className={cn(
                                        "p-4 cursor-pointer flex-col items-start space-y-1 relative",
                                        !n.is_read && "bg-primary/5"
                                    )}
                                    onSelect={() => handleNotificationClick(n)}
                                >
                                    {!n.is_read && (
                                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                                    )}
                                    <div className="flex justify-between items-start gap-2 w-full">
                                        <p className="font-bold text-sm leading-tight">{n.title}</p>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-2 border-t text-center">
                    <Button variant="ghost" className="w-full text-xs" onClick={() => navigate('/notifications')}>
                        Ver todo el historial
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
