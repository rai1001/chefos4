import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { ScheduleService } from '@/services/schedule.service';
import { ScheduleRulesValidator } from '@/services/schedule-rules.validator';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export class ScheduleController {
    private scheduleService = new ScheduleService();
    private rulesValidator = new ScheduleRulesValidator();

    async createMonth(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { month } = req.body;
            if (!month) {
                throw new AppError(400, 'month is required');
            }

            const data = await this.scheduleService.createMonth({
                organizationId: req.user!.organizationIds[0],
                month,
                createdBy: req.user!.id,
            });

            res.status(201).json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error creating schedule month');
            res.status(500).json({ error: 'Failed to create schedule month' });
        }
    }

    async getMonth(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const data = await this.scheduleService.getMonth({
                id,
                organizationIds: req.user!.organizationIds,
            });
            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error fetching schedule month');
            res.status(500).json({ error: 'Failed to fetch schedule month' });
        }
    }

    async publishMonth(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const validation = await this.rulesValidator.validateMonth({
                monthId: id,
                organizationIds: req.user!.organizationIds,
            });

            if (validation.errors.length > 0) {
                res.status(400).json({ error: 'Validation failed', details: validation });
                return;
            }

            const data = await this.scheduleService.publishMonth({
                id,
                organizationIds: req.user!.organizationIds,
                userId: req.user!.id,
            });
            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error publishing schedule month');
            res.status(500).json({ error: 'Failed to publish schedule month' });
        }
    }

    async validateMonth(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const validation = await this.rulesValidator.validateMonth({
                monthId: id,
                organizationIds: req.user!.organizationIds,
            });
            res.json({ data: validation });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error validating schedule month');
            res.status(500).json({ error: 'Failed to validate schedule month' });
        }
    }

    async createShift(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { schedule_month_id, date, start_time, end_time, shift_code, station, template_id } = req.body;
            if (!schedule_month_id || !date || !start_time || !end_time || !shift_code) {
                throw new AppError(400, 'Missing required fields');
            }

            const data = await this.scheduleService.createShift({
                organizationId: req.user!.organizationIds[0],
                scheduleMonthId: schedule_month_id,
                date,
                startTime: start_time,
                endTime: end_time,
                shiftCode: shift_code,
                station,
                templateId: template_id,
            });

            res.status(201).json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error creating shift');
            res.status(500).json({ error: 'Failed to create shift' });
        }
    }

    async updateShift(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { date, start_time, end_time, shift_code, station } = req.body;

            const data = await this.scheduleService.updateShift({
                id,
                organizationIds: req.user!.organizationIds,
                date,
                startTime: start_time,
                endTime: end_time,
                shiftCode: shift_code,
                station,
            });

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error updating shift');
            res.status(500).json({ error: 'Failed to update shift' });
        }
    }

    async updateAssignments(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { staff_ids } = req.body;
            if (!Array.isArray(staff_ids)) {
                throw new AppError(400, 'staff_ids must be an array');
            }

            const data = await this.scheduleService.updateAssignments({
                shiftId: id,
                organizationIds: req.user!.organizationIds,
                staffIds: staff_ids,
            });

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error updating assignments');
            res.status(500).json({ error: 'Failed to update assignments' });
        }
    }
}
