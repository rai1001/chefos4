export interface ExpiryCandidate {
    date: string;
    confidence: number;
    raw: string;
}

const FULL_DATE_REGEX = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g;
const ISO_DATE_REGEX = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g;
const MONTH_YEAR_REGEX = /\b(\d{1,2})[\/\-](\d{4})\b/g;

export class ExpiryOCRService {
    static extractCandidates(text: string): ExpiryCandidate[] {
        const candidates: ExpiryCandidate[] = [];

        const pushCandidate = (dateIso: string, confidence: number, raw: string) => {
            if (!candidates.find((c) => c.date === dateIso && c.raw === raw)) {
                candidates.push({ date: dateIso, confidence, raw });
            }
        };

        for (const match of text.matchAll(ISO_DATE_REGEX)) {
            const [raw, year, month, day] = match;
            const iso = this.toIsoDate(year, month, day);
            if (iso) pushCandidate(iso, 0.95, raw);
        }

        for (const match of text.matchAll(FULL_DATE_REGEX)) {
            const [raw, day, month, year] = match;
            const iso = this.toIsoDate(year.length === 2 ? `20${year}` : year, month, day);
            if (iso) pushCandidate(iso, 0.9, raw);
        }

        for (const match of text.matchAll(MONTH_YEAR_REGEX)) {
            const [raw, month, year] = match;
            const iso = this.toIsoDate(year, month, '01');
            if (iso) pushCandidate(iso, 0.6, raw);
        }

        return candidates.sort((a, b) => b.confidence - a.confidence);
    }

    static async scanImage(_buffer: Buffer): Promise<ExpiryCandidate[]> {
        // Placeholder OCR: replace with Vision API integration.
        const mockText = 'CAD 12/02/2026 LOTE 1234';
        return this.extractCandidates(mockText);
    }

    private static toIsoDate(year: string, month: string, day: string): string | null {
        const y = Number(year);
        const m = Number(month);
        const d = Number(day);
        if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
        if (m < 1 || m > 12 || d < 1 || d > 31) return null;
        const iso = new Date(Date.UTC(y, m - 1, d)).toISOString().split('T')[0];
        return iso;
    }
}
