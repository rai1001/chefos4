import { api } from './api';

export interface WasteCause {
    id: string;
    organization_id: string | null;
    name: string;
    description?: string;
    is_system: boolean;
}

export interface WasteStats {
    totalValue: number;
    byCause: { name: string; value: number }[];
    byIngredient: { name: string; value: number }[];
    recentLogs: any[];
}

class WasteService {
    async getCauses() {
        const response = await api.get('/waste/causes');
        return response.data.data;
    }

    async createCause(data: { name: string; description?: string }) {
        const response = await api.post('/waste/causes', data);
        return response.data.data;
    }

    async logWaste(data: { ingredient_id: string; quantity: number; waste_cause_id: string; notes?: string }) {
        const response = await api.post('/waste/log', data);
        return response.data;
    }

    async getStats(startDate?: string, endDate?: string) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await api.get(`/waste/stats?${params.toString()}`);
        return response.data.data;
    }
}

export const wasteService = new WasteService();
