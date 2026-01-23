import { api } from '@/services/api';

export type OccupancyImportType = 'forecast' | 'actual';

export interface OccupancyRow {
    id: string;
    service_date: string;
    occupancy_forecast: number;
    occupancy_actual: number;
    breakfasts_forecast: number;
    lunches_forecast: number;
    dinners_forecast: number;
    breakfasts_actual: number;
    lunches_actual: number;
    dinners_actual: number;
}

export const occupancyService = {
    async list(params: { start_date?: string; end_date?: string } = {}): Promise<OccupancyRow[]> {
        const { data } = await api.get('/occupancy', { params });
        return data.data || [];
    },

    async importFile(file: File, importType: OccupancyImportType, dryRun: boolean) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('importType', importType);
        formData.append('dryRun', dryRun ? 'true' : 'false');
        const { data } = await api.post('/occupancy/import', formData);
        return data.data;
    },
};
