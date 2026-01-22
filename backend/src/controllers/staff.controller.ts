import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { StaffService } from '@/services/staff.service';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export class StaffController {
    private staffService = new StaffService();

    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const staff = await this.staffService.listStaff(req.user!.organizationIds);
            res.json({ data: staff });
        } catch (error) {
            logger.error(error, 'Error listing staff');
            res.status(500).json({ error: 'Failed to fetch staff' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const organizationId = req.user!.organizationIds[0];
            const { member_id, role_in_kitchen, skills, active, contract } = req.body;

            if (!member_id) {
                throw new AppError(400, 'member_id is required');
            }

            const staff = await this.staffService.createStaff({
                organizationId,
                memberId: member_id,
                roleInKitchen: role_in_kitchen,
                skills,
                active,
                contract,
            });

            res.status(201).json({ data: staff });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error creating staff');
            res.status(500).json({ error: 'Failed to create staff' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { role_in_kitchen, skills, active, contract } = req.body;

            const staff = await this.staffService.updateStaff({
                id,
                organizationIds: req.user!.organizationIds,
                roleInKitchen: role_in_kitchen,
                skills,
                active,
                contract,
            });

            res.json({ data: staff });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error updating staff');
            res.status(500).json({ error: 'Failed to update staff' });
        }
    }

    async getVacationBalance(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const year = Number(req.query.year) || new Date().getFullYear();

            const balance = await this.staffService.getVacationBalance({
                staffId: id,
                year,
                organizationIds: req.user!.organizationIds,
            });

            res.json({ data: balance });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error fetching vacation balance');
            res.status(500).json({ error: 'Failed to fetch vacation balance' });
        }
    }
}
