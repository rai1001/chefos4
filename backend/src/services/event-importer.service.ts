
import csv from 'csv-parser';
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
}

export class EventImporterService {
    async analyzeCSV(fileBuffer: Buffer, organizationId: string): Promise<{ total_rows: number; preview: any[] }> {
        const rows: any[] = [];
        await new Promise((resolve, reject) => {
            Readable.from(fileBuffer)
                .pipe(csv())
                .on('data', (row: any) => {
                    rows.push({
                        nombre_evento: row['Nombre Evento'] || row['nombre_evento'],
                        tipo: row['Tipo'] || row['tipo'],
                        fecha_inicio: row['Fecha Inicio'] || row['fecha_inicio'],
                        pax: row['Pax'] || row['pax'],
                        recetas: row['Recetas'] || row['recetas'],
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        return { total_rows: rows.length, preview: rows.slice(0, 5) };
    }

    async executeImport(fileBuffer: Buffer, organizationId: string): Promise<{ imported: number; errors: string[] }> {
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

        let imported = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                if (!row.nombre_evento || !row.fecha_inicio) {
                    errors.push(`Filtro omitido: Falta nombre o fecha para ${row.nombre_evento || 'evento desconocido'}`);
                    continue;
                }

                const { data: event, error: eventError } = await supabase.from('events').insert({
                    organization_id: organizationId,
                    name: row.nombre_evento.trim(),
                    event_type: this.mapEventType(row.tipo),
                    date_start: new Date(row.fecha_inicio).toISOString(),
                    date_end: row.fecha_fin ? new Date(row.fecha_fin).toISOString() : new Date(row.fecha_inicio).toISOString(),
                    pax: parseInt(row.pax) || 0,
                    status: 'DRAFT'
                }).select().single();

                if (eventError) throw eventError;

                if (row.recetas) {
                    await this.processEventMenus(event.id, row.recetas, organizationId);
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
}
