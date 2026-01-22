import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';

export class ReportGeneratorService {
    /**
     * Genera un PDF del inventario actual
     */
    async generateInventoryPDF(orgIds: string[]): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                // 1. Obtener datos
                const { data: ingredients, error } = await supabase
                    .from('ingredients')
                    .select('*, units(abbreviation), product_families(name), suppliers(name)')
                    .in('organization_id', orgIds)
                    .is('deleted_at', null)
                    .order('name');

                if (error) throw new AppError(500, 'Error fetching inventory');

                // 2. Crear documento
                const doc = new PDFDocument({ margin: 50 });
                const buffers: Buffer[] = [];

                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                // 3. Cabecera
                doc.fontSize(20).text('Reporte de Inventario', { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}`, { align: 'right' });
                doc.moveDown();

                // 4. Tabla (Simple)
                // En un caso real usaría una librería de tablas para pdfkit o calculo manual de x,y
                ingredients?.forEach((ing: any) => {
                    const stockStatus = ing.stock_current <= ing.stock_min ? '[LOW]' : '[OK]';
                    doc.fontSize(10).text(
                        `${ing.name} | Stock: ${ing.stock_current} ${ing.units?.abbreviation} | ${stockStatus}`
                    );
                    doc.fontSize(8).fillColor('grey').text(`Familia: ${ing.product_families?.name || '-'} | Proveedor: ${ing.suppliers?.name || '-'}`);
                    doc.fillColor('black').moveDown(0.5);
                });

                doc.end();
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Genera un Excel del inventario
     */
    async generateInventoryExcel(orgIds: string[]): Promise<Buffer> {
        const { data: ingredients, error } = await supabase
            .from('ingredients')
            .select('*, units(abbreviation), product_families(name), suppliers(name)')
            .in('organization_id', orgIds)
            .is('deleted_at', null)
            .order('name');

        if (error) throw new AppError(500, 'Error fetching inventory');

        const rows = ingredients.map((ing: any) => ({
            Nombre: ing.name,
            Familia: ing.product_families?.name,
            Stock_Actual: ing.stock_current,
            Unidad: ing.units?.abbreviation,
            Stock_Minimo: ing.stock_min,
            Costo: ing.cost_price,
            Valor_Total: ing.stock_current * ing.cost_price,
            Proveedor: ing.suppliers?.name
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
}

export const reportService = new ReportGeneratorService();
