/**
 * Sanitizes a value for Excel export to prevent Formula Injection (CSV Injection).
 * If the value is a string and starts with one of the trigger characters (=, +, -, @),
 * it prepends a single quote to force Excel to treat it as text.
 *
 * @param value The value to sanitize
 * @returns The sanitized value
 */
export function sanitizeForExcel(value: unknown): unknown {
    if (typeof value === 'string') {
        if (['=', '+', '-', '@'].includes(value.charAt(0))) {
            return "'" + value;
        }
    }
    return value;
}
