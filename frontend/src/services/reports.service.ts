import { api } from './api';
import { saveAs } from 'file-saver';

class ReportsService {
    async downloadInventoryPDF() {
        const response = await api.get('/reports/inventory/pdf', {
            responseType: 'blob',
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        saveAs(blob, `inventario-${new Date().toISOString().split('T')[0]}.pdf`);
    }

    async downloadInventoryExcel() {
        const response = await api.get('/reports/inventory/excel', {
            responseType: 'blob',
        });
        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, `inventario-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
}

export const reportsService = new ReportsService();
