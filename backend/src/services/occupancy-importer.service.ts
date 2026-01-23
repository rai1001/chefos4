import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

export type OccupancyImportType = 'forecast' | 'actual';

export interface OccupancyRow {
    service_date: string;
    occupancy?: number;
    breakfasts?: number;
    lunches?: number;
    dinners?: number;
}

const HEADER_ALIASES: Record<string, string[]> = {
    fecha: ['fecha', 'date'],
    desayunos: ['desayunos', 'breakfasts', 'breakfast'],
    comidas: ['comidas', 'almuerzos', 'lunches', 'lunch'],
    cenas: ['cenas', 'dinners', 'dinner'],
    ocupacion: ['pax in house', 'pax inhouse', 'pax house', 'ocupacion', '% ocup'],
};

export class OccupancyImporterService {
    async analyze(fileBuffer: Buffer, fileName?: string): Promise<{ total_rows: number; preview: OccupancyRow[] }> {
        const rows = await this.parseRows(fileBuffer, fileName);
        return { total_rows: rows.length, preview: rows.slice(0, 5) };
    }

    async parseRows(fileBuffer: Buffer, fileName?: string): Promise<OccupancyRow[]> {
        const isExcel = fileName ? /\.(xlsx|xls)$/i.test(fileName) : false;
        return isExcel ? this.parseExcelRows(fileBuffer) : this.parseCSVRows(fileBuffer);
    }

    private async parseCSVRows(fileBuffer: Buffer): Promise<OccupancyRow[]> {
        const rows: OccupancyRow[] = [];
        await new Promise((resolve, reject) => {
            Readable.from(fileBuffer)
                .pipe(csv())
                .on('data', (row: any) => {
                    const serviceDate = this.parseDate(row[this.findHeaderKey(row, 'fecha')]);
                    if (!serviceDate) return;

                    const breakfasts = this.parseNumber(row[this.findHeaderKey(row, 'desayunos')]);
                    const lunches = this.parseNumber(row[this.findHeaderKey(row, 'comidas')]);
                    const dinners = this.parseNumber(row[this.findHeaderKey(row, 'cenas')]);
                    const occupancy = this.parseNumber(row[this.findHeaderKey(row, 'ocupacion')]);

                    rows.push({
                        service_date: serviceDate,
                        occupancy,
                        breakfasts,
                        lunches,
                        dinners,
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });
        return rows;
    }

    private parseExcelRows(fileBuffer: Buffer): OccupancyRow[] {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const rows: OccupancyRow[] = [];

        workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false });
            if (!data || data.length === 0) return;

            const headerRowIndex = this.findHeaderRowIndex(data);
            if (headerRowIndex === -1) return;

            const headerRow = data[headerRowIndex];
            const headerMap = this.buildHeaderMap(headerRow);

            for (let i = headerRowIndex + 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;

                const serviceDate = this.parseDate(row[headerMap.fecha]);
                if (!serviceDate) continue;

                const breakfasts = this.parseNumber(row[headerMap.desayunos]);
                const lunches = this.parseNumber(row[headerMap.comidas]);
                const dinners = this.parseNumber(row[headerMap.cenas]);
                const occupancy = this.parseNumber(row[headerMap.ocupacion]);

                rows.push({
                    service_date: serviceDate,
                    occupancy,
                    breakfasts,
                    lunches,
                    dinners,
                });
            }
        });

        return rows;
    }

    private findHeaderRowIndex(data: any[][]): number {
        for (let i = 0; i < Math.min(data.length, 15); i++) {
            const row = data[i];
            if (!row) continue;
            const normalized = row.map((cell) => String(cell || '').toLowerCase().trim());
            if (normalized.includes('fecha')) return i;
        }
        return -1;
    }

    private buildHeaderMap(headerRow: any[]): Record<string, number> {
        const normalized = headerRow.map((cell) => String(cell || '').toLowerCase().trim());
        const map: Record<string, number> = {
            fecha: normalized.indexOf('fecha'),
            desayunos: this.findHeaderIndex(normalized, 'desayunos'),
            comidas: this.findHeaderIndex(normalized, 'comidas'),
            cenas: this.findHeaderIndex(normalized, 'cenas'),
            ocupacion: this.findHeaderIndex(normalized, 'ocupacion'),
        };

        if (map.desayunos === -1 || map.comidas === -1 || map.cenas === -1) {
            const lastIndex = normalized.length - 1;
            map.cenas = map.cenas === -1 ? lastIndex : map.cenas;
            map.comidas = map.comidas === -1 ? lastIndex - 1 : map.comidas;
            map.desayunos = map.desayunos === -1 ? lastIndex - 2 : map.desayunos;
        }

        return map;
    }

    private findHeaderIndex(normalized: string[], key: keyof typeof HEADER_ALIASES): number {
        const aliases = HEADER_ALIASES[key];
        for (const alias of aliases) {
            const idx = normalized.findIndex((value) => value.includes(alias));
            if (idx !== -1) return idx;
        }
        return -1;
    }

    private findHeaderKey(row: any, key: keyof typeof HEADER_ALIASES): string | undefined {
        const aliases = HEADER_ALIASES[key];
        const keys = Object.keys(row || {});
        const normalized = keys.map((k) => k.toLowerCase().trim());
        for (const alias of aliases) {
            const idx = normalized.findIndex((value) => value.includes(alias));
            if (idx !== -1) return keys[idx];
        }
        return undefined;
    }

    private parseDate(value: any): string | null {
        if (!value) return null;
        if (value instanceof Date && !Number.isNaN(value.valueOf())) {
            return value.toISOString().slice(0, 10);
        }
        if (typeof value === 'number') {
            const parsed = XLSX.SSF?.parse_date_code?.(value);
            if (parsed) {
                const iso = new Date(parsed.y, parsed.m - 1, parsed.d).toISOString().slice(0, 10);
                return iso;
            }
            const excelDate = this.excelSerialToDate(value);
            if (excelDate) return excelDate;
        }
        const raw = String(value).trim();
        const match = raw.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
        if (match) {
            const day = Number(match[1]);
            const month = Number(match[2]);
            const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
            if (day && month && year) {
                return new Date(year, month - 1, day).toISOString().slice(0, 10);
            }
        }
        return null;
    }

    private excelSerialToDate(serial: number): string | null {
        if (!Number.isFinite(serial)) return null;
        const utcDays = Math.floor(serial - 25569);
        const utcValue = utcDays * 86400 * 1000;
        const date = new Date(utcValue);
        if (Number.isNaN(date.valueOf())) return null;
        return date.toISOString().slice(0, 10);
    }

    private parseNumber(value: any): number | undefined {
        if (value === null || value === undefined || value === '') return undefined;
        const cleaned = String(value).replace(',', '.').replace(/[^\d.-]/g, '');
        const num = Number(cleaned);
        return Number.isFinite(num) ? Math.round(num) : undefined;
    }
}
