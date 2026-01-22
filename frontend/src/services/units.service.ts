import { api } from './api';

export interface Unit {
    id: string;
    name: string;
    abbreviation: string;
    type?: string;
}

export const unitsService = {
    async getAll() {
        const response = await api.get('/units');
        return response.data.data as Unit[];
    },
};
