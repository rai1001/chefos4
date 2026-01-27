/**
 * Sanitizes a value for safe inclusion in Excel/CSV exports to prevent Formula Injection.
 *
 * Formula Injection (CSV Injection) occurs when untrusted input containing formula triggers
 * (like =, +, -, @) is interpreted as a formula by spreadsheet software.
 *
 * @param value The value to sanitize
 * @returns The sanitized value
 */
export const sanitizeForExcel = (value: any): any => {
  if (typeof value !== 'string') {
    return value;
  }

  // Check for unsafe prefixes that could trigger formula execution
  const unsafePrefixes = ['=', '+', '-', '@'];
  const firstChar = value.charAt(0);

  if (unsafePrefixes.includes(firstChar)) {
    // Prepend a single quote to force the cell to be treated as text
    return `'${value}`;
  }

  return value;
};
