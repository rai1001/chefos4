
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export class NotificationService {
    /**
     * Crear notificación
     */
    async create(params: {
        organizationId: string;
        userId?: string;
        type: string;
        priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
        title: string;
        message: string;
        data?: any;
        actionUrl?: string;
        expiresAt?: Date;
    }): Promise<void> {
        const { error } = await supabase.from('notifications').insert({
            organization_id: params.organizationId,
            user_id: params.userId || null,
            type: params.type,
            priority: params.priority,
            title: params.title,
            message: params.message,
            data: params.data || {},
            action_url: params.actionUrl,
            expires_at: params.expiresAt?.toISOString(),
        });

        if (error) {
            logger.error(error, 'Error creating notification');
        }
    }

    /**
     * Marcar como leída
     */
    async markAsRead(notificationId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('user_id', userId);

        if (error) {
            logger.error(error, 'Error marking notification as read');
        }
    }

    /**
     * Marcar todas como leídas
     */
    async markAllAsRead(userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) {
            logger.error(error, 'Error marking all notifications as read');
        }
    }

    /**
     * Limpiar notificaciones expiradas
     */
    async cleanExpired(): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .lt('expires_at', new Date().toISOString());

        if (error) {
            logger.error(error, 'Error cleaning expired notifications');
        }
    }
}
