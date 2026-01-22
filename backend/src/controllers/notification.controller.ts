
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { NotificationService } from '@/services/notification.service';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '../utils/errors';

const notificationService = new NotificationService();

export class NotificationController {
    /**
     * Get user notifications
     */
    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const organizationIds = req.user!.organizationIds;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .or(`user_id.eq.${userId},and(user_id.is.null,organization_id.in.(${organizationIds.join(',')}))`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                logger.error(error, 'Error fetching notifications');
                throw new AppError(500, 'Failed to fetch notifications');
            }

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ message: error.message });
            } else {
                logger.error(error, 'Unexpected error in notification controller');
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            await notificationService.markAsRead(id, userId);

            res.json({ message: 'Notification marked as read' });
        } catch (error: any) {
            logger.error(error, 'Error marking notification as read');
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * Mark all as read
     */
    async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;

            await notificationService.markAllAsRead(userId);

            res.json({ message: 'All notifications marked as read' });
        } catch (error: any) {
            logger.error(error, 'Error marking all notifications as read');
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}
