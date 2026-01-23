import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { ScheduleCoverageService } from '@/services/schedule-coverage.service';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export class ScheduleCoverageController {
    private coverageService = new ScheduleCoverageService();

    async getCoverageRules(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { from, to } = req.query;
            const data = await this.coverageService.getCoverageRules({
                organizationId: req.user!.organizationIds[0],
                from: typeof from === 'string' ? from : undefined,
                to: typeof to === 'string' ? to : undefined,
            });
            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error fetching coverage rules');
            res.status(500).json({ error: 'Failed to fetch coverage rules' });
        }
    }

    async updateCoverageRules(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { rules } = req.body;
            if (!Array.isArray(rules)) {
                throw new AppError(400, 'rules must be an array');
            }

            const data = await this.coverageService.updateCoverageRules({
                organizationId: req.user!.organizationIds[0],
                rules,
            });

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error updating coverage rules');
            res.status(500).json({ error: 'Failed to update coverage rules' });
        }
    }

    async createOverride(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { date, shift_code, required_staff, station, reason } = req.body;
            if (!date || !shift_code || required_staff === undefined) {
                throw new AppError(400, 'Missing required fields');
            }

            const data = await this.coverageService.createOverride({
                organizationId: req.user!.organizationIds[0],
                override: {
                    date,
                    shift_code,
                    required_staff,
                    station: station ?? null,
                    reason: reason ?? null,
                },
            });

            res.status(201).json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error creating coverage override');
            res.status(500).json({ error: 'Failed to create coverage override' });
        }
    }
}
