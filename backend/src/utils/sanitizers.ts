/**
 * Sanitizes a value for safe inclusion in an Excel cell to prevent Formula Injection (CSV Injection).
 *
 * Formula Injection occurs when a user input starting with =, +, -, or @ is interpreted as a formula
 * by spreadsheet software (Excel, Google Sheets, LibreOffice).
 *
 * @param value The value to sanitize
 * @returns The sanitized value
 */
export function sanitizeForExcel(value: any): any {
    if (typeof value !== 'string') {
        return value;
    }

    // Dangerous characters that can start a formula
    // We also check for tab and carriage return as they can be used for DDE attacks or formatting issues
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];

    if (dangerousChars.some(char => value.startsWith(char))) {
        return `'${value}`;
    }

    return value;
}
