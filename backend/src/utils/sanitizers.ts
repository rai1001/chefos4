/**
 * Sanitizes a value for Excel/CSV export to prevent Formula Injection (CWE-1236).
 * Prepends a single quote if the value starts with dangerous characters (=, +, -, @, tab, cr).
 *
 * @param value The value to sanitize
 * @returns The sanitized value
 */
export function sanitizeForExcel(value: any): any {
    if (typeof value === 'string') {
        if (value.startsWith('=') ||
            value.startsWith('+') ||
            value.startsWith('-') ||
            value.startsWith('@') ||
            value.startsWith('\t') ||
            value.startsWith('\r')) {
            return `'${value}`;
        }
    }
    return value;
}
