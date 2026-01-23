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

    async downloadPurchaseOrdersPDF(eventId?: string) {
        const response = await api.get('/reports/purchase-orders/pdf', {
            responseType: 'blob',
            params: eventId ? { event_id: eventId } : undefined,
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const suffix = eventId ? `event-${eventId}` : new Date().toISOString().split('T')[0];
        saveAs(blob, `ordenes-compra-${suffix}.pdf`);
    }
}

export const reportsService = new ReportsService();
