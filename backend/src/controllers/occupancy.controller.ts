import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { OccupancyImporterService, OccupancyImportType } from '@/services/occupancy-importer.service';

export class OccupancyController {
    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
            const orgIds = req.user!.organizationIds;

            let query = supabase
                .from('daily_service_counts')
                .select('*')
                .in('organization_id', orgIds)
                .order('service_date', { ascending: true });

            if (start_date) query = query.gte('service_date', start_date);
            if (end_date) query = query.lte('service_date', end_date);

            const { data, error } = await query;
            if (error) throw error;

            res.json({ data: data || [] });
        } catch (error) {
            logger.error(error, 'Error fetching occupancy data');
            res.status(500).json({ error: 'Failed to fetch occupancy data' });
        }
    }

    async importCSV(req: AuthRequest, res: Response): Promise<void> {
        try {
            const file = req.file;
            if (!file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            const organizationId = req.user?.organizationIds?.[0];
            if (!organizationId) {
                res.status(400).json({ error: 'Organization ID not found for user' });
                return;
            }
            const importType = (req.body.importType || 'forecast') as OccupancyImportType;
            const dryRun = req.body.dryRun === 'true';

            const importer = new OccupancyImporterService();
            const rows = await importer.parseRows(file.buffer, file.originalname);

            if (dryRun) {
                res.json({ data: { total_rows: rows.length, preview: rows.slice(0, 5) } });
                return;
            }

            let imported = 0;
            const errors: string[] = [];

            for (const row of rows) {
                try {
                    if (!row.service_date) {
                        errors.push('Fila sin fecha');
                        continue;
                    }

                    const payload: any = {
                        organization_id: organizationId,
                        service_date: row.service_date,
                    };

                    if (importType === 'forecast') {
                        payload.occupancy_forecast = row.occupancy ?? 0;
                        payload.breakfasts_forecast = row.breakfasts ?? 0;
                        payload.lunches_forecast = row.lunches ?? 0;
                        payload.dinners_forecast = row.dinners ?? 0;
                    } else {
                        payload.occupancy_actual = row.occupancy ?? 0;
                        payload.breakfasts_actual = row.breakfasts ?? 0;
                        payload.lunches_actual = row.lunches ?? 0;
                        payload.dinners_actual = row.dinners ?? 0;
                    }

                    const { error } = await supabase.from('daily_service_counts').upsert(payload, {
                        onConflict: 'organization_id,service_date',
                    });
                    if (error) throw error;
                    imported++;
                } catch (err: any) {
                    errors.push(`Error en ${row.service_date || 'fila'}: ${err.message}`);
                }
            }

            res.json({ data: { imported, errors } });
        } catch (error) {
            logger.error(error, 'Error importing occupancy CSV');
            res.status(500).json({ error: 'Failed to import occupancy CSV' });
        }
    }
}
