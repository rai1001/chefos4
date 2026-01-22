import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';
import { DeliveryEstimatorService } from '@/services/delivery-estimator.service';

export class SuppliersController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orgIds = req.user!.organizationIds;
            const { search = '' } = req.query;

            let query = supabase
                .from('suppliers')
                .select('*', { count: 'exact' })
                .in('organization_id', orgIds)
                .is('deleted_at', null);

            if (search) {
                query = query.ilike('name', `%${search}%`);
            }

            const { data, error, count } = await query.order('name');

            if (error) throw error;

            res.json({ data: data || [], total: count || 0 });
        } catch (error: any) {
            logger.error(error, 'Error fetching suppliers');
            res.status(500).json({ error: 'Failed to fetch suppliers' });
        }
    }

    async getById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;

            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('id', id)
                .in('organization_id', orgIds)
                .is('deleted_at', null)
                .single();

            if (error || !data) {
                throw new AppError(404, 'Supplier not found');
            }

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error fetching supplier');
            res.status(500).json({ error: 'Failed to fetch supplier' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const {
                name,
                contact_email,
                contact_phone,
                lead_time_days,
                default_family_id,
                cut_off_time,
                delivery_days,
            } = req.body;

            const organizationId = req.user!.organizationIds[0];

            if (delivery_days && delivery_days.length === 0) {
                throw new AppError(400, 'At least one delivery day must be specified');
            }

            const normalizedCutoff =
                typeof cut_off_time === 'string' && cut_off_time.length === 5
                    ? `${cut_off_time}:00`
                    : cut_off_time ?? null;

            const { data, error } = await supabase
                .from('suppliers')
                .insert({
                    organization_id: organizationId,
                    name,
                    contact_email,
                    contact_phone,
                    lead_time_days: lead_time_days || 2,
                    default_family_id: default_family_id || null,
                    cut_off_time: normalizedCutoff,
                    delivery_days: delivery_days || [1, 2, 3, 4, 5],
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new AppError(409, 'Supplier with this name already exists');
                }
                throw error;
            }

            res.status(201).json({ data: data || {} });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error creating supplier');
            res.status(500).json({ error: 'Failed to create supplier' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;
            const updateData = req.body;

            if ('default_family_id' in updateData && !updateData.default_family_id) {
                updateData.default_family_id = null;
            }

            const { data: existing } = await supabase
                .from('suppliers')
                .select('id')
                .eq('id', id)
                .in('organization_id', orgIds)
                .is('deleted_at', null)
                .single();

            if (!existing) {
                throw new AppError(404, 'Supplier not found');
            }

            const { data, error } = await supabase
                .from('suppliers')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error updating supplier');
            res.status(500).json({ error: 'Failed to update supplier' });
        }
    }

    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;

            const { count } = await supabase
                .from('ingredients')
                .select('id', { count: 'exact', head: true })
                .eq('supplier_id', id)
                .is('deleted_at', null);

            if (count && count > 0) {
                throw new AppError(
                    400,
                    `Cannot delete supplier with ${count} associated ingredients`
                );
            }

            const { error } = await supabase
                .from('suppliers')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .in('organization_id', orgIds);

            if (error) throw error;

            res.json({ message: 'Supplier deleted successfully' });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error(error, 'Error deleting supplier');
            res.status(500).json({ error: 'Failed to delete supplier' });
        }
    }

    async estimateDelivery(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { order_date } = req.query;

            const estimator = new DeliveryEstimatorService();
            const orderDate = order_date ? new Date(order_date as string) : new Date();
            const estimatedDate = await estimator.estimateDeliveryDate(id, orderDate);

            res.json({
                supplier_id: id,
                order_date: orderDate.toISOString(),
                estimated_delivery: estimatedDate.toISOString(),
            });
        } catch (error: any) {
            logger.error(error, 'Error estimating delivery');
            res.status(500).json({ error: 'Failed to estimate delivery date' });
        }
    }

    async getWithCutoffStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orgIds = req.user!.organizationIds;

            const { data: suppliers, error } = await supabase
                .from('suppliers')
                .select('*')
                .in('organization_id', orgIds)
                .is('deleted_at', null)
                .not('cut_off_time', 'is', null);

            if (error) throw error;

            const estimator = new DeliveryEstimatorService();
            const now = new Date();

            const data = suppliers?.map((supplier) => {
                const minutes = supplier.cut_off_time
                    ? estimator.calculateTimeUntilCutoff(supplier.cut_off_time, now)
                    : null;
                const isDeliveryDay = supplier.delivery_days
                    ? estimator.isDeliveryDayToday(supplier.delivery_days)
                    : false;

                return {
                    ...supplier,
                    cutoff_status: {
                        minutes_until_cutoff: minutes,
                        is_delivery_day: isDeliveryDay,
                        is_urgent: minutes !== null && minutes > 0 && minutes < 120,
                        has_passed: minutes !== null && minutes < 0,
                    },
                };
            }) || [];

            res.json({ data });
        } catch (error: any) {
            logger.error(error, 'Error fetching suppliers with cutoff status');
            res.status(500).json({ error: 'Failed to fetch suppliers' });
        }
    }
}
