import * as XLSX from 'xlsx';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export class ReportGeneratorService {
    /**
     * Genera un reporte de inventario en formato Excel
     */
    async generateInventoryExcel(organizationId: string): Promise<Buffer> {
        try {
            // 1. Obtener datos de ingredientes
            const { data: ingredients, error } = await supabase
                .from('ingredients')
                .select(`
                    name,
                    cost_price,
                    stock_min,
                    unit:units(name),
                    family:product_families(name),
                    supplier:suppliers(name)
                `)
                .eq('organization_id', organizationId);

            if (error) throw error;

            // 2. Transformar datos para Excel
            const reportData = (ingredients || []).map(item => ({
                'Nombre': item.name,
                'Familia': item.family?.name || 'S/F',
                'Precio Costo': item.cost_price,
                'Unidad': item.unit?.name || 'uds',
                'Stock Mín': item.stock_min || 0,
                'Proveedor': item.supplier?.name || 'S/P'
            }));

            // 3. Crear libro y hoja
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(reportData);

            XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

            // 4. Generar Buffer
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            return buf;
        } catch (error) {
            logger.error('Error generating inventory excel:', error);
            throw error;
        }
    }

    /**
     * Genera reporte de producción para un evento
     */
    async generateProductionExcel(eventId: string): Promise<Buffer> {
        try {
            const { data: tasks, error } = await supabase
                .from('production_tasks')
                .select(`
                    title,
                    status,
                    priority,
                    scheduled_start,
                    scheduled_end,
                    estimated_duration_minutes,
                    recipe:recipes(name)
                `)
                .eq('event_id', eventId);

            if (error) throw error;

            const reportData = (tasks || []).map(task => ({
                'Tarea': task.title,
                'Estado': task.status,
                'Prioridad': task.priority,
                'Inicio': new Date(task.scheduled_start).toLocaleString(),
                'Fin': new Date(task.scheduled_end).toLocaleString(),
                'Minutos Est.': task.estimated_duration_minutes,
                'Receta': task.recipe?.name || 'N/A'
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(reportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Producción');

            return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        } catch (error) {
            logger.error('Error generating production excel:', error);
            throw error;
        }
    }
}
