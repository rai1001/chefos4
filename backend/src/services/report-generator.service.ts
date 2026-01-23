import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
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

    /**
     * Genera un PDF de órdenes de compra agrupadas por proveedor
     */
    async generatePurchaseOrdersPDF(organizationId: string, eventId?: string): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                let query = supabase
                    .from('purchase_orders')
                    .select(`
                        id,
                        order_date,
                        delivery_date_estimated,
                        total_cost,
                        status,
                        supplier:suppliers (id, name),
                        items:purchase_order_items (
                            quantity_ordered,
                            unit_price,
                            ingredient:ingredients (name),
                            unit:units (abbreviation)
                        )
                    `)
                    .eq('organization_id', organizationId)
                    .order('order_date', { ascending: true });

                if (eventId) {
                    query = query.eq('event_id', eventId);
                }

                const { data: orders, error } = await query;
                if (error) throw error;

                const grouped = new Map<string, {
                    supplierName: string;
                    items: Map<string, {
                        ingredientName: string;
                        unitAbbr: string;
                        unitPrice: number;
                        quantity: number;
                        subtotal: number;
                    }>;
                    total: number;
                }>();

                (orders || []).forEach((order: any) => {
                    const supplierId = order.supplier?.id || 'unknown';
                    const supplierName = order.supplier?.name || 'Proveedor sin nombre';

                    if (!grouped.has(supplierId)) {
                        grouped.set(supplierId, {
                            supplierName,
                            items: new Map(),
                            total: 0,
                        });
                    }

                    const group = grouped.get(supplierId)!;

                    (order.items || []).forEach((item: any) => {
                        const ingredientName = item.ingredient?.name || 'Ingrediente';
                        const unitAbbr = item.unit?.abbreviation || '';
                        const unitPrice = Number(item.unit_price || 0);
                        const quantity = Number(item.quantity_ordered || 0);
                        const key = `${ingredientName}|${unitAbbr}|${unitPrice}`;
                        const subtotal = quantity * unitPrice;

                        if (!group.items.has(key)) {
                            group.items.set(key, {
                                ingredientName,
                                unitAbbr,
                                unitPrice,
                                quantity: 0,
                                subtotal: 0,
                            });
                        }

                        const entry = group.items.get(key)!;
                        entry.quantity += quantity;
                        entry.subtotal += subtotal;
                        group.total += subtotal;
                    });
                });

                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const buffers: Buffer[] = [];

                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                doc.fontSize(18).text('Ordenes de Compra - Compras', { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(10).text(`Fecha: ${new Date().toLocaleDateString()}`, { align: 'right' });
                if (eventId) {
                    doc.text(`Evento: ${eventId}`, { align: 'right' });
                }
                doc.moveDown();

                const columnX = {
                    ingredient: 50,
                    quantity: 300,
                    unit: 370,
                    price: 430,
                    subtotal: 500,
                };

                const renderHeader = () => {
                    doc.fontSize(10).fillColor('black');
                    doc.text('Ingrediente', columnX.ingredient);
                    doc.text('Cantidad', columnX.quantity);
                    doc.text('Unidad', columnX.unit);
                    doc.text('Precio', columnX.price);
                    doc.text('Subtotal', columnX.subtotal);
                    doc.moveDown(0.5);
                    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                    doc.moveDown(0.5);
                };

                let supplierIndex = 0;
                grouped.forEach((group) => {
                    if (supplierIndex > 0) {
                        doc.addPage();
                    }
                    supplierIndex += 1;

                    doc.fontSize(14).text(group.supplierName);
                    doc.fontSize(10).fillColor('grey').text(`Total proveedor: €${group.total.toFixed(2)}`);
                    doc.fillColor('black');
                    doc.moveDown(0.5);

                    renderHeader();

                    let rowY = doc.y;
                    group.items.forEach((item) => {
                        if (rowY > 700) {
                            doc.addPage();
                            renderHeader();
                            rowY = doc.y;
                        }

                        doc.fontSize(9).text(item.ingredientName, columnX.ingredient, rowY);
                        doc.text(item.quantity.toFixed(2), columnX.quantity, rowY);
                        doc.text(item.unitAbbr, columnX.unit, rowY);
                        doc.text(`€${item.unitPrice.toFixed(2)}`, columnX.price, rowY);
                        doc.text(`€${item.subtotal.toFixed(2)}`, columnX.subtotal, rowY);
                        rowY += 16;
                    });
                });

                if (grouped.size === 0) {
                    doc.fontSize(12).text('No hay ordenes de compra para exportar.');
                }

                doc.end();
            } catch (error) {
                logger.error('Error generating purchase orders PDF:', error);
                reject(error);
            }
        });
    }
}
