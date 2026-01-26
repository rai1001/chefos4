export interface ValidationError {
    row: number;
    type: string;
    message: string;
    field?: string;
    value?: string;
}

export const createValidationError = (
    row: number,
    type: string,
    message: string,
    field?: string,
    value?: string
): ValidationError => ({
    row,
    type,
    message,
    field,
    value,
});

export const validateFile = (buffer: Buffer, filename: string) => {
    if (!filename.toLowerCase().endsWith('.csv')) {
        return { valid: false, errors: ['Invalid file type. Only .csv files are allowed.'] };
    }
    return { valid: true, errors: [] };
};

export const normalizeKey = (key: string): string =>
    key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

export const validateHeaders = (headers: string[], required: string[]) => {
    const normalizedHeaders = headers.map(h => normalizeKey(h));
    const missing = required.filter(r => !normalizedHeaders.includes(normalizeKey(r)));

    return {
        valid: missing.length === 0,
        missing,
        found: headers
    };
};

export const isCSVInjection = (value: string): boolean => {
    if (!value) return false;
    // CSV Injection protection
    const unsafePrefixes = ['=', '+', '-', '@'];

    // Check if it starts with an unsafe prefix
    if (unsafePrefixes.some(prefix => value.startsWith(prefix))) {
        return true;
    }

    // Check for tab or carriage return at the start which can also be risky
    if (value.match(/^[\t\r\n]/)) {
        return true;
    }

    return false;
};

export const parseFloatSafe = (value: string): number | null => {
    if (!value) return null;
    // Remove currency symbols and other non-numeric chars except dot and comma
    const cleanValue = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? null : parsed;
};
