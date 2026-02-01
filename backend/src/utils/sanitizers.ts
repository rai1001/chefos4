
/**
 * Sanitizes a value for Excel/CSV export to prevent Formula Injection.
 * Prepends a single quote if the value starts with =, +, -, or @.
 */
export function sanitizeForExcel(value: unknown): string | number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'number') {
        return value;
    }

    const stringValue = String(value);

    // If the string starts with =, +, -, or @, prepend a single quote
    // to force Excel to treat it as text instead of a formula.
    if (/^[=+\-@]/.test(stringValue)) {
        return "'" + stringValue;
    }

    return stringValue;
}
