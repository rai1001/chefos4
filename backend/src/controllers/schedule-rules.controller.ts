import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { ScheduleRulesService } from '@/services/schedule-rules.service';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export class ScheduleRulesController {
    private rulesService = new ScheduleRulesService();

    async getStaffRules(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { staffId } = req.params;
            const data = await this.rulesService.getStaffRules({
                staffId,
                organizationIds: req.user!.organizationIds,
            });
            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error fetching staff rules');
            res.status(500).json({ error: 'Failed to fetch staff rules' });
        }
    }

    async updateStaffRules(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { staffId } = req.params;
            const {
                allowed_shift_codes,
                rotation_mode,
                preferred_days_off,
                max_consecutive_days,
                requires_weekend_off_per_month,
            } = req.body;

            const data = await this.rulesService.updateStaffRules({
                staffId,
                organizationIds: req.user!.organizationIds,
                allowedShiftCodes: allowed_shift_codes,
                rotationMode: rotation_mode,
                preferredDaysOff: preferred_days_off,
                maxConsecutiveDays: max_consecutive_days,
                requiresWeekendOff: requires_weekend_off_per_month,
            });

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error updating staff rules');
            res.status(500).json({ error: 'Failed to update staff rules' });
        }
    }

    async getOrgRules(req: AuthRequest, res: Response): Promise<void> {
        try {
            const data = await this.rulesService.getOrgRules(req.user!.organizationIds[0]);
            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error fetching org rules');
            res.status(500).json({ error: 'Failed to fetch org rules' });
        }
    }

    async updateOrgRules(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { weekend_definition, enforce_weekend_off_hard, rotation_enabled } = req.body;
            const data = await this.rulesService.updateOrgRules({
                organizationId: req.user!.organizationIds[0],
                weekendDefinition: weekend_definition,
                enforceWeekendOffHard: enforce_weekend_off_hard,
                rotationEnabled: rotation_enabled,
            });
            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error updating org rules');
            res.status(500).json({ error: 'Failed to update org rules' });
        }
    }
}
