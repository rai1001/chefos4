/**
 * Sanitizes a string for safe usage in Excel formulas (prevents Formula Injection/CSV Injection).
 * Prepend a single quote (') if the string starts with =, +, -, @, \t, or \r.
 *
 * @param value The string to sanitize.
 * @returns The sanitized string.
 */
export const sanitizeForExcel = (value: string | null | undefined): string => {
  if (!value) return '';

  // dangerous characters that can trigger formula execution
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];

  if (dangerousChars.some((char) => value.startsWith(char))) {
    return `'${value}`;
  }

  return value;
};
