import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { TimeOffService } from '@/services/time-off.service';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export class TimeOffController {
    private timeOffService = new TimeOffService();

    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const status = req.query.status as string | undefined;
            const data = await this.timeOffService.listTimeOff(req.user!.organizationIds, status);
            res.json({ data });
        } catch (error) {
            logger.error(error, 'Error listing time off');
            res.status(500).json({ error: 'Failed to fetch time off' });
        }
    }

    async request(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { staff_id, type, start_date, end_date, notes } = req.body;
            if (!staff_id || !type || !start_date || !end_date) {
                throw new AppError(400, 'Missing required fields');
            }

            const data = await this.timeOffService.requestTimeOff({
                staffId: staff_id,
                type,
                startDate: start_date,
                endDate: end_date,
                notes,
                createdBy: req.user!.id,
            });

            res.status(201).json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error requesting time off');
            res.status(500).json({ error: 'Failed to request time off' });
        }
    }

    async approve(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const policy = (req.body.policy as 'CALENDAR' | 'BUSINESS') || 'CALENDAR';

            const data = await this.timeOffService.approveTimeOff({
                id,
                approvedBy: req.user!.id,
                policy,
            });

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error approving time off');
            res.status(500).json({ error: 'Failed to approve time off' });
        }
    }

    async reject(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const data = await this.timeOffService.rejectTimeOff({
                id,
                approvedBy: req.user!.id,
            });

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error rejecting time off');
            res.status(500).json({ error: 'Failed to reject time off' });
        }
    }
}
