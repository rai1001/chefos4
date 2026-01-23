
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

interface EventCSVRow {
    nombre_evento: string;
    tipo: string;
    fecha_inicio: string;
    fecha_fin?: string;
    pax: string;
    recetas?: string; // Comma separated list: "Paella:50, Gazpacho:30"
    location?: string;
}

const MONTHS_MAP: Record<string, number> = {
    ENERO: 1,
    FEBRERO: 2,
    MARZO: 3,
    ABRIL: 4,
    MAYO: 5,
    JUNIO: 6,
    JULIO: 7,
    AGOSTO: 8,
    SEPTIEMBRE: 9,
    OCTUBRE: 10,
    NOVIEMBRE: 11,
    DICIEMBRE: 12,
};

export class EventImporterService {
    async analyzeCSV(fileBuffer: Buffer, organizationId: string, fileName?: string): Promise<{ total_rows: number; preview: any[] }> {
        const rows = await this.parseRows(fileBuffer, fileName);
        return { total_rows: rows.length, preview: rows.slice(0, 5) };
    }

    async executeImport(fileBuffer: Buffer, organizationId: string, fileName?: string): Promise<{ imported: number; errors: string[] }> {
        const rows = await this.parseRows(fileBuffer, fileName);

        let imported = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                if (!row.nombre_evento || !row.fecha_inicio) {
                    errors.push(`Filtro omitido: Falta nombre o fecha para ${row.nombre_evento || 'evento desconocido'}`);
                    continue;
                }

                const name = row.nombre_evento.trim();
                const dateStart = new Date(row.fecha_inicio);
                const dateEnd = row.fecha_fin ? new Date(row.fecha_fin) : dateStart;
                const pax = parseInt(row.pax) || 0;

                const dayStart = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate());
                const dayEnd = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate() + 1);

                const { data: existing } = await supabase
                    .from('events')
                    .select('id, location, pax')
                    .eq('organization_id', organizationId)
                    .eq('name', name)
                    .gte('date_start', dayStart.toISOString())
                    .lt('date_start', dayEnd.toISOString())
                    .is('deleted_at', null)
                    .single();

                let eventId = existing?.id;

                if (eventId) {
                    const mergedLocation = this.mergeLocations(existing.location, row.location);
                    const updatePayload: any = {
                        pax: pax || existing.pax || 0,
                        location: mergedLocation,
                    };

                    await supabase.from('events').update(updatePayload).eq('id', eventId);
                } else {
                    const { data: event, error: eventError } = await supabase.from('events').insert({
                        organization_id: organizationId,
                        name,
                        event_type: this.mapEventType(row.tipo),
                        date_start: dateStart.toISOString(),
                        date_end: dateEnd.toISOString(),
                        pax,
                        location: row.location || null,
                        status: 'DRAFT'
                    }).select().single();

                    if (eventError) throw eventError;
                    eventId = event.id;
                }

                if (row.recetas) {
                    await this.processEventMenus(eventId, row.recetas, organizationId);
                }

                imported++;
            } catch (error: any) {
                errors.push(`Error en "${row.nombre_evento}": ${error.message}`);
            }
        }

        return { imported, errors };
    }

    private mapEventType(type: string): string {
        const t = type.toUpperCase().trim();
        if (['BANQUET', 'A_LA_CARTE', 'COFFEE', 'BUFFET', 'SPORTS_MULTI'].includes(t)) return t;
        if (t.includes('COFFEE')) return 'COFFEE';
        if (t.includes('BUFFET')) return 'BUFFET';
        if (t.includes('CARTA')) return 'A_LA_CARTE';
        return 'BANQUET';
    }

    private async processEventMenus(eventId: string, recetasStr: string, organizationId: string): Promise<void> {
        const pairs = recetasStr.split(',').map(p => p.trim());
        for (const pair of pairs) {
            const [recipeName, qtyStr] = pair.split(':').map(s => s.trim());
            const qty = parseInt(qtyStr) || 1;

            const { data: recipe } = await supabase
                .from('recipes')
                .select('id')
                .eq('organization_id', organizationId)
                .ilike('name', recipeName)
                .single();

            if (recipe) {
                await supabase.from('event_menus').insert({
                    event_id: eventId,
                    recipe_id: recipe.id,
                    qty_forecast: qty
                });
            }
        }
    }

    private async parseRows(fileBuffer: Buffer, fileName?: string): Promise<EventCSVRow[]> {
        const isExcel = fileName ? /\.(xlsx|xls)$/i.test(fileName) : false;
        return isExcel ? this.parseExcelRows(fileBuffer) : this.parseCSVRows(fileBuffer);
    }

    private async parseCSVRows(fileBuffer: Buffer): Promise<EventCSVRow[]> {
        const rows: EventCSVRow[] = [];
        await new Promise((resolve, reject) => {
            Readable.from(fileBuffer).pipe(csv()).on('data', (row: any) => rows.push({
                nombre_evento: row['Nombre Evento'] || row['nombre_evento'],
                tipo: row['Tipo'] || row['tipo'] || 'BANQUET',
                fecha_inicio: row['Fecha Inicio'] || row['fecha_inicio'],
                fecha_fin: row['Fecha Fin'] || row['fecha_fin'],
                pax: row['Pax'] || row['pax'] || '0',
                recetas: row['Recetas'] || row['recetas'],
            })).on('end', resolve).on('error', reject);
        });
        return rows;
    }

    private parseExcelRows(fileBuffer: Buffer): EventCSVRow[] {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const rows: EventCSVRow[] = [];

        workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false });
            if (!data || data.length === 0) return;

            const yearMatch = sheetName.match(/\b(20\d{2})\b/);
            const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

            let currentMonth = this.detectMonthFromRow(data[0] || []);
            let headerRowIndex = this.findHeaderRowIndex(data);
            if (headerRowIndex === -1) return;

            const headerRow = data[headerRowIndex];
            const roomHeaders = headerRow.slice(1).map((h) => String(h || '').trim()).filter(Boolean);

            for (let i = headerRowIndex + 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;

                const colA = row[0];
                const monthFromRow = this.detectMonthFromRow([colA]);
                if (monthFromRow) {
                    currentMonth = monthFromRow;
                    continue;
                }

                const day = this.parseDayNumber(colA);
                if (!day || !currentMonth) continue;

                for (let colIndex = 1; colIndex <= roomHeaders.length; colIndex++) {
                    const roomName = roomHeaders[colIndex - 1];
                    const cellValue = row[colIndex];
                    if (!cellValue) continue;

                    const rawText = String(cellValue).trim();
                    if (!rawText) continue;

                    const { name, pax } = this.parseEventText(rawText);
                    const dateStr = new Date(year, currentMonth - 1, day).toISOString();

                    rows.push({
                        nombre_evento: name,
                        tipo: 'BANQUET',
                        fecha_inicio: dateStr,
                        fecha_fin: dateStr,
                        pax: pax ? String(pax) : '0',
                        location: roomName,
                    });
                }
            }
        });

        return this.mergeDuplicateRows(rows);
    }

    private findHeaderRowIndex(data: any[][]): number {
        for (let i = 0; i < Math.min(data.length, 10); i++) {
            const row = data[i];
            if (!row) continue;
            const nonEmpty = row.slice(1).filter((cell) => String(cell || '').trim() !== '');
            if (nonEmpty.length >= 3) {
                return i;
            }
        }
        return -1;
    }

    private detectMonthFromRow(row: any[]): number | null {
        for (const cell of row) {
            const value = String(cell || '').toUpperCase().trim();
            if (MONTHS_MAP[value]) return MONTHS_MAP[value];
        }
        return null;
    }

    private parseDayNumber(value: any): number | null {
        const num = Number(value);
        if (!Number.isNaN(num) && num >= 1 && num <= 31) return num;
        const match = String(value || '').match(/(\d{1,2})/);
        if (match) {
            const parsed = Number(match[1]);
            return parsed >= 1 && parsed <= 31 ? parsed : null;
        }
        return null;
    }

    private parseEventText(text: string): { name: string; pax?: number } {
        const paxMatch = text.match(/(\d+)\s*PAX/i);
        const pax = paxMatch ? Number(paxMatch[1]) : undefined;
        const name = text.replace(/\/?\s*\d+\s*PAX/i, '').trim();
        return { name: name || text.trim(), pax };
    }

    private mergeDuplicateRows(rows: EventCSVRow[]): EventCSVRow[] {
        const map = new Map<string, EventCSVRow>();
        rows.forEach((row) => {
            const key = `${row.fecha_inicio}|${row.nombre_evento}`.toLowerCase();
            if (!map.has(key)) {
                map.set(key, row);
                return;
            }
            const existing = map.get(key)!;
            existing.location = this.mergeLocations(existing.location, row.location);
            const existingPax = parseInt(existing.pax) || 0;
            const newPax = parseInt(row.pax) || 0;
            if (newPax > 0 && existingPax === 0) {
                existing.pax = String(newPax);
            }
        });
        return Array.from(map.values());
    }

    private mergeLocations(existing?: string, incoming?: string): string | undefined {
        const locations = new Set<string>();
        if (existing) existing.split(',').map(s => s.trim()).filter(Boolean).forEach(l => locations.add(l));
        if (incoming) incoming.split(',').map(s => s.trim()).filter(Boolean).forEach(l => locations.add(l));
        const merged = Array.from(locations).join(', ');
        return merged || existing || incoming;
    }
}
