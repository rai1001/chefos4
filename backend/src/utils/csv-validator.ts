export interface ValidationError {
    row: number;
    code: string;
    message: string;
    field?: string;
    value?: string;
}

export function createValidationError(
    row: number,
    code: string,
    message: string,
    field?: string,
    value?: string
): ValidationError {
    return { row, code, message, field, value };
}

export function validateFile(buffer: Buffer, filename: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!filename.toLowerCase().endsWith('.csv')) {
        errors.push('File must be a CSV');
    }
    return { valid: errors.length === 0, errors };
}

// Helper for normalization (alphanumeric lowercase)
const normalizeKey = (key: string): string =>
    key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

export function validateHeaders(headers: string[], required: string[]): { valid: boolean; missing: string[]; found: string[] } {
    const normalizedHeaders = new Set(headers.map(h => normalizeKey(h)));

    const missing = required.filter(req => {
        // Check if the required field (normalized) exists in the headers (normalized)
        return !normalizedHeaders.has(normalizeKey(req));
    });

    return {
        valid: missing.length === 0,
        missing,
        found: headers
    };
}

export function sanitizeCSVValue(value: string): string {
    if (!value) return '';
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousChars.some(char => value.startsWith(char))) {
        return `'${value}`;
    }
    return value;
}

export function parseFloatSafe(value: string): number | null {
    if (!value) return null;
    // Handle both dot and comma decimals
    const clean = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
}
