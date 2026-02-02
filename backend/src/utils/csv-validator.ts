export interface ValidationError {
    row: number;
    column: string;
    message: string;
    value?: string;
    type?: string;
}

export function createValidationError(row: number, type: string, message: string, column?: string, value?: string): ValidationError {
    return {
        row,
        column: column || '',
        message,
        value,
        type
    };
}

export function validateFile(buffer: Buffer, filename: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!filename.toLowerCase().endsWith('.csv')) {
        errors.push('Invalid file type. Only .csv is allowed');
    }

    // Check for empty buffer
    if (buffer.length === 0) {
        errors.push('File is empty');
    }

    // Limit file size (e.g. 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
         errors.push('File too large. Max 10MB');
    }

    return { valid: errors.length === 0, errors };
}

// Aliases for header validation (mirrors logic in csv-importer.service.ts)
const COLUMN_ALIASES: Record<string, string[]> = {
    'nombre_articulo': ['nombrearticulo', 'articulo', 'producto', 'nombre', 'descripcion', 'item', 'material'],
    'proveedor': ['proveedor', 'supplier', 'vendor'],
    'precio': ['precio', 'coste', 'costo', 'price', 'preciounitario', 'costeunitario'],
    'unidad': ['unidad', 'ud', 'un', 'uom', 'unit', 'unidadmedida'],
    'familia': ['familia', 'categoria', 'category']
};

const normalizeKey = (key: string): string =>
    key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

export function validateHeaders(headers: string[], required: string[]): { valid: boolean; missing: string[]; found: string[] } {
    const normalizedHeaders = headers.map(h => normalizeKey(h));
    const missing: string[] = [];
    const found: string[] = [];

    for (const req of required) {
        const aliases = COLUMN_ALIASES[req] || [req];
        const isPresent = aliases.some(alias => normalizedHeaders.includes(alias));

        if (isPresent) {
            found.push(req);
        } else {
            missing.push(req);
        }
    }

    return {
        valid: missing.length === 0,
        missing,
        found
    };
}

export function parseFloatSafe(value: string): number | null {
    if (!value) return null;
    // Replace comma with dot for decimals, remove other non-numeric chars except dot and minus
    // But be careful not to remove dot if it's used as thousand separator in some locales?
    // Standard assumption here: simple parsing.

    // Check if it looks like "1.234,56" (European) or "1,234.56" (US)
    // Simple heuristic: replace , with . if , is the last separator

    let cleaned = value.trim();

    // Remove currency symbols and spaces
    cleaned = cleaned.replace(/[^\d.,-]/g, '');

    if (cleaned === '') return null;

    // Normalize decimal separator to dot
    if (cleaned.indexOf(',') > -1 && cleaned.indexOf('.') > -1) {
        if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
             // 1.234,56 -> 1234.56
             cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
             // 1,234.56 -> 1234.56
             cleaned = cleaned.replace(/,/g, '');
        }
    } else if (cleaned.indexOf(',') > -1) {
        // Only comma: 1,5 or 1,234 (could be ambiguous, assuming decimal if value is small?)
        // Safer to treat , as decimal in most non-US contexts import
        cleaned = cleaned.replace(',', '.');
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Sanitizes a value to prevent CSV Injection (Formula Injection).
 * If the value starts with characters that could be interpreted as a formula
 * by spreadsheet software (=, +, -, @, tab, CR), prepends a single quote.
 */
export function sanitizeCSVValue(value: string): string {
    if (typeof value !== 'string') return value;
    if (!value) return value;

    const dangerousPrefixes = ['=', '+', '-', '@'];
    const trimmed = value.trim();

    if (dangerousPrefixes.some(prefix => trimmed.startsWith(prefix))) {
        return `'${value}`;
    }

    // Also escape if the raw value starts with tab or CR, which trim() removes
    if (value.startsWith('\t') || value.startsWith('\r')) {
        return `'${value}`;
    }

    return value;
}
