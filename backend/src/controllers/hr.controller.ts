
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { HRService } from '@/services/hr.service';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';

export class HRController {
    private hrService = new HRService();

    async invite(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { email, role } = req.body;
            const organizationId = req.user!.organizationIds[0];
            const userId = req.user!.id;

            const invitation = await this.hrService.createInvitation(email, role, organizationId, userId);

            // In a real app, we would send an email here.
            // For now, we return the token/invitation details.
            res.status(201).json({ data: invitation });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error in invite controller');
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getEmployees(req: AuthRequest, res: Response): Promise<void> {
        try {
            const organizationId = req.user!.organizationIds[0];
            const employees = await this.hrService.getEmployees(organizationId);
            res.json({ data: employees });
        } catch (error) {
            logger.error(error, 'Error fetching employees');
            res.status(500).json({ error: 'Failed to fetch employees' });
        }
    }

    async getSchedules(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { start_date, end_date } = req.query;
            const organizationId = req.user!.organizationIds[0];
            const schedules = await this.hrService.getSchedules(
                organizationId,
                start_date as string,
                end_date as string
            );
            res.json({ data: schedules });
        } catch (error) {
            logger.error(error, 'Error fetching schedules');
            res.status(500).json({ error: 'Failed to fetch schedules' });
        }
    }

    async saveSchedule(req: AuthRequest, res: Response): Promise<void> {
        try {
            const organizationId = req.user!.organizationIds[0];
            const schedule = await this.hrService.upsertSchedule(organizationId, req.body);
            res.json({ data: schedule });
        } catch (error) {
            logger.error(error, 'Error saving schedule');
            res.status(500).json({ error: 'Failed to save schedule' });
        }
    }
}
