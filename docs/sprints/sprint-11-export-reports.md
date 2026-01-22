# SPRINT 11: Exportación de Reportes (PDF/Excel) 📄


**Duración:** 1 semana  
**Objetivo:** Implementar generación de reportes descargables en PDF y Excel con templates profesionales.


---


## 🎯 ARQUITECTURA


### Backend - Report Generator Service


`backend/src/services/report-generator.service.ts`:
````typescript
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { Readable } from 'stream';


interface ReportConfig {
  title: string;
  subtitle?: string;
  organizationName: string;
  period?: {
    start: Date;
    end: Date;
  };
  logo?: string;
}


export class ReportGeneratorService {
  /**
   * Generar reporte de Food Cost en PDF
   */
  async generateFoodCostPDF(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. Obtener datos
        const { data: kpis } = await supabase
          .from('analytics_kpis')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('period_start', startDate.toISOString().split('T')[0])
          .lte('period_end', endDate.toISOString().split('T')[0])
          .order('period_start');


        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', organizationId)
          .single();


        // 2. Crear PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];


        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));


        // 3. Header
        this.addPDFHeader(doc, {
          title: 'Informe de Food Cost',
          subtitle: `Periodo: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
          organizationName: org?.name || 'Organización',
        });


        // 4. KPIs Summary
        doc.moveDown(2);
        doc.fontSize(14).text('Resumen de KPIs', { underline: true });
        doc.moveDown(0.5);


        if (kpis && kpis.length > 0) {
          const totals = kpis.reduce(
            (acc, kpi) => ({
              totalCost: acc.totalCost + (kpi.total_cost || 0),
              totalRevenue: acc.totalRevenue + (kpi.total_revenue || 0),
              wasteCost: acc.wasteCost + (kpi.waste_cost || 0),
            }),
            { totalCost: 0, totalRevenue: 0, wasteCost: 0 }
          );


          const avgFoodCost = totals.totalRevenue > 0
            ? (totals.totalCost / totals.totalRevenue) * 100
            : 0;


          doc.fontSize(12);
          doc.text(`Coste Total: ${this.formatCurrency(totals.totalCost)}`);
          doc.text(`Ingresos Total: ${this.formatCurrency(totals.totalRevenue)}`);
          doc.text(`Food Cost %: ${avgFoodCost.toFixed(2)}%`);
          doc.text(`Mermas: ${this.formatCurrency(totals.wasteCost)}`);
        }


        // 5. Tabla de detalle mensual
        doc.moveDown(2);
        doc.fontSize(14).text('Detalle Mensual', { underline: true });
        doc.moveDown(1);


        if (kpis && kpis.length > 0) {
          this.addPDFTable(doc, {
            headers: ['Periodo', 'Coste', 'Ingresos', 'Food Cost %', 'Mermas'],
            rows: kpis.map((kpi) => [
              this.formatDate(new Date(kpi.period_start)),
              this.formatCurrency(kpi.total_cost || 0),
              this.formatCurrency(kpi.total_revenue || 0),
              `${(kpi.food_cost_pct || 0).toFixed(2)}%`,
              this.formatCurrency(kpi.waste_cost || 0),
            ]),
          });
        }


        // 6. Footer
        this.addPDFFooter(doc);


        doc.end();
      } catch (error) {
        logger.error('Error generating PDF:', error);
        reject(error);
      }
    });
  }


  /**
   * Generar reporte de inventario en Excel
   */
  async generateInventoryExcel(organizationId: string): Promise {
    try {
      // 1. Obtener datos
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select(`
          *,
          product_families (name),
          suppliers (name),
          units (name, abbreviation)
        `)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('name');


      // 2. Crear Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CulinaryOS';
      workbook.created = new Date();


      const worksheet = workbook.addWorksheet('Inventario', {
        properties: { tabColor: { argb: 'FF00FF00' } },
      });


      // 3. Headers con estilo
      worksheet.columns = [
        { header: 'Nombre', key: 'name', width: 30 },
        { header: 'Familia', key: 'family', width: 20 },
        { header: 'Proveedor', key: 'supplier', width: 25 },
        { header: 'Stock Actual', key: 'stock_current', width: 15 },
        { header: 'Stock Mínimo', key: 'stock_min', width: 15 },
        { header: 'Unidad', key: 'unit', width: 10 },
        { header: 'Precio', key: 'cost_price', width: 12 },
        { header: 'Valor Stock', key: 'stock_value', width: 15 },
        { header: 'Estado', key: 'status', width: 12 },
      ];


      // Estilo del header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };


      // 4. Datos
      ingredients?.forEach((ing) => {
        const stockValue = (ing.stock_current || 0) * (ing.cost_price || 0);
        const status =
          ing.stock_current <= ing.stock_min
            ? 'BAJO'
            : ing.stock_current < ing.stock_min * 2
            ? 'NORMAL'
            : 'ALTO';


        const row = worksheet.addRow({
          name: ing.name,
          family: ing.product_families?.name || '-',
          supplier: ing.suppliers?.name || '-',
          stock_current: ing.stock_current || 0,
          stock_min: ing.stock_min || 0,
          unit: ing.units?.abbreviation || '',
          cost_price: ing.cost_price || 0,
          stock_value: stockValue,
          status: status,
        });


        // Formato de números
        row.getCell('cost_price').numFmt = '€#,##0.00';
        row.getCell('stock_value').numFmt = '€#,##0.00';


        // Color condicional según estado
        const statusCell = row.getCell('status');
        if (status === 'BAJO') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' },
          };
          statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        } else if (status === 'NORMAL') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC000' },
          };
        } else {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF92D050' },
          };
        }
      });


      // 5. Totales
      const lastRow = worksheet.rowCount + 2;
      worksheet.getCell(`A${lastRow}`).value = 'TOTALES';
      worksheet.getCell(`A${lastRow}`).font = { bold: true };


      const totalValue = ingredients?.reduce(
        (sum, ing) => sum + (ing.stock_current || 0) * (ing.cost_price || 0),
        0
      );


      worksheet.getCell(`H${lastRow}`).value = totalValue;
      worksheet.getCell(`H${lastRow}`).numFmt = '€#,##0.00';
      worksheet.getCell(`H${lastRow}`).font = { bold: true };


      // 6. Autofilter
      worksheet.autoFilter = {
        from: 'A1',
        to: `I${worksheet.rowCount}`,
      };


      // 7. Generar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Error generating Excel:', error);
      throw error;
    }
  }


  /**
   * Generar reporte de órdenes de compra en Excel
   */
  async generatePurchaseOrdersExcel(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise {
    try {
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers (name),
          event:events (name),
          items:purchase_order_items (
            *,
            ingredient:ingredients (name),
            unit:units (abbreviation)
          )
        `)
        .eq('organization_id', organizationId)
        .gte('order_date', startDate.toISOString())
        .lte('order_date', endDate.toISOString())
        .order('order_date', { ascending: false });


      const workbook = new ExcelJS.Workbook();


      // Sheet 1: Resumen de POs
      const summarySheet = workbook.addWorksheet('Resumen');
      summarySheet.columns = [
        { header: 'Nº Orden', key: 'id', width: 10 },
        { header: 'Proveedor', key: 'supplier', width: 25 },
        { header: 'Evento', key: 'event', width: 25 },
        { header: 'Fecha Pedido', key: 'order_date', width: 15 },
        { header: 'Entrega Estimada', key: 'delivery_est', width: 15 },
        { header: 'Estado', key: 'status', width: 12 },
        { header: 'Total', key: 'total', width: 12 },
      ];


      this.styleExcelHeader(summarySheet.getRow(1));


      pos?.forEach((po) => {
        summarySheet.addRow({
          id: po.id.slice(0, 8),
          supplier: po.supplier?.name || '-',
          event: po.event?.name || '-',
          order_date: new Date(po.order_date),
          delivery_est: po.delivery_date_estimated
            ? new Date(po.delivery_date_estimated)
            : null,
          status: po.status,
          total: po.total_cost || 0,
        });
      });


      summarySheet.getColumn('order_date').numFmt = 'dd/mm/yyyy';
      summarySheet.getColumn('delivery_est').numFmt = 'dd/mm/yyyy';
      summarySheet.getColumn('total').numFmt = '€#,##0.00';


      // Sheet 2: Detalle por items
      const detailSheet = workbook.addWorksheet('Detalle Items');
      detailSheet.columns = [
        { header: 'Nº Orden', key: 'po_id', width: 10 },
        { header: 'Proveedor', key: 'supplier', width: 25 },
        { header: 'Ingrediente', key: 'ingredient', width: 30 },
        { header: 'Cantidad Pedida', key: 'qty_ordered', width: 15 },
        { header: 'Cantidad Recibida', key: 'qty_received', width: 15 },
        { header: 'Unidad', key: 'unit', width: 10 },
        { header: 'Precio Unitario', key: 'unit_price', width: 15 },
        { header: 'Total Línea', key: 'line_total', width: 15 },
      ];


      this.styleExcelHeader(detailSheet.getRow(1));


      pos?.forEach((po) => {
        po.items?.forEach((item: any) => {
          detailSheet.addRow({
            po_id: po.id.slice(0, 8),
            supplier: po.supplier?.name || '-',
            ingredient: item.ingredient?.name || '-',
            qty_ordered: item.quantity_ordered,
            qty_received: item.quantity_received || 0,
            unit: item.unit?.abbreviation || '',
            unit_price: item.unit_price || 0,
            line_total: item.total_price || 0,
          });
        });
      });


      detailSheet.getColumn('unit_price').numFmt = '€#,##0.00';
      detailSheet.getColumn('line_total').numFmt = '€#,##0.00';


      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Error generating PO Excel:', error);
      throw error;
    }
  }


  // ========================================
  // HELPERS - PDF
  // ========================================


  private addPDFHeader(doc: PDFKit.PDFDocument, config: ReportConfig): void {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(config.title, { align: 'center' });


    if (config.subtitle) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(config.subtitle, { align: 'center' });
    }


    doc
      .fontSize(10)
      .text(config.organizationName, { align: 'center' })
      .moveDown();


    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();
  }


  private addPDFTable(
    doc: PDFKit.PDFDocument,
    data: { headers: string[]; rows: string[][] }
  ): void {
    const startY = doc.y;
    const colWidths = [100, 100, 100, 80, 100];
    const rowHeight = 25;


    // Headers
    doc.fontSize(10).font('Helvetica-Bold');
    let x = 50;


    data.headers.forEach((header, i) => {
      doc.text(header, x, startY, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });


    // Rows
    doc.font('Helvetica');
    let y = startY + rowHeight;


    data.rows.forEach((row) => {
      x = 50;
      row.forEach((cell, i) => {
        doc.text(cell, x, y, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });
      y += rowHeight;
    });


    doc.y = y + 10;
  }


  private addPDFFooter(doc: PDFKit.PDFDocument): void {
    const pages = doc.bufferedPageRange();


    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);


      doc
        .fontSize(8)
        .text(
          `Página ${i + 1} de ${pages.count}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );


      doc.text(
        `Generado el ${new Date().toLocaleDateString('es-ES')}`,
        50,
        doc.page.height - 35,
        { align: 'center' }
      );
    }
  }


  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }


  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }


  // ========================================
  // HELPERS - EXCEL
  // ========================================


  private styleExcelHeader(row: ExcelJS.Row): void {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
  }
}
````


---


### Backend - Controller


`backend/src/controllers/reports.controller.ts`:
````typescript
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { ReportGeneratorService } from '@/services/report-generator.service';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';


export class ReportsController {
  async exportFoodCostPDF(req: AuthRequest, res: Response): Promise {
    try {
      const organizationId = req.user!.organizationIds[0];
      const { start_date, end_date } = req.query;


      if (!start_date || !end_date) {
        throw new AppError(400, 'start_date and end_date required');
      }


      const service = new ReportGeneratorService();
      const buffer = await service.generateFoodCostPDF(
        organizationId,
        new Date(start_date as string),
        new Date(end_date as string)
      );


      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="food-cost-${start_date}-${end_date}.pdf"`
      );
      res.send(buffer);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error exporting food cost PDF:', error);
      res.status(500).json({ error: 'Failed to export report' });
    }
  }


  async exportInventoryExcel(req: AuthRequest, res: Response): Promise {
    try {
      const organizationId = req.user!.organizationIds[0];


      const service = new ReportGeneratorService();
      const buffer = await service.generateInventoryExcel(organizationId);


      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="inventario-${new Date().toISOString().split('T')[0]}.xlsx"`
      );
      res.send(buffer);
    } catch (error) {
      logger.error('Error exporting inventory Excel:', error);
      res.status(500).json({ error: 'Failed to export report' });
    }
  }


  async exportPurchaseOrdersExcel(req: AuthRequest, res: Response): Promise {
    try {
      const organizationId = req.user!.organizationIds[0];
      const { start_date, end_date } = req.query;


      if (!start_date || !end_date) {
        throw new AppError(400, 'start_date and end_date required');
      }


      const service = new ReportGeneratorService();
      const buffer = await service.generatePurchaseOrdersExcel(
        organizationId,
        new Date(start_date as string),
        new Date(end_date as string)
      );


      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ordenes-compra-${start_date}-${end_date}.xlsx"`
      );
      res.send(buffer);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error exporting PO Excel:', error);
      res.status(500).json({ error: 'Failed to export report' });
    }
  }
}
````


---


### Frontend - Export Buttons


`frontend/src/components/reports/ExportButtons.tsx`:
````tsx
import { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';


interface ExportButtonsProps {
  reportType: 'food-cost' | 'inventory' | 'purchase-orders';
  dateRange?: {
    start: Date;
    end: Date;
  };
}


export function ExportButtons({ reportType, dateRange }: ExportButtonsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();


  const handleExport = async (format: 'pdf' | 'excel') => {
    setLoading(true);


    try {
      let url = '';
      let filename = '';


      switch (reportType) {
        case 'food-cost':
          if (!dateRange) return;
          url = `/reports/food-cost/pdf?start_date=${dateRange.start.toISOString()}&end_date=${dateRange.end.toISOString()}`;
          filename = `food-cost-${dateRange.start.toISOString().split('T')[0]}.pdf`;
          break;


        case 'inventory':
          url = '/reports/inventory/excel';
          filename = `inventario-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;


        case 'purchase-orders':
          if (!dateRange) return;
          url = `/reports/purchase-orders/excel?start_date=${dateRange.start.toISOString()}&end_date=${dateRange.end.toISOString()}`;
          filename = `ordenes-compra-${dateRange.start.toISOString().split('T')[0]}.xlsx`;
          break;
      }


      const response = await api.get(url, {
        responseType: 'blob',
      });


      // Descargar archivo
      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();


      toast({
        title: 'Reporte descargado',
        description: 'El archivo se ha descargado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error al exportar',
        description: 'No se pudo generar el reporte',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    
      
        
          
          {loading ? 'Generando...' : 'Exportar'}
        
      
      
        {reportType === 'food-cost' && (
          <DropdownMenuItem onClick={() => handleExport('pdf')}>
            
            Exportar PDF
          
        )}
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          
          Exportar Excel
        
      
    
  );
}
````


---


## 📉 SPRINT 12: Gestión de Mermas y Causas


### **`
