import { describe, it, expect } from 'vitest';
import { sanitizeForExcel } from '../../src/utils/sanitizers';

describe('sanitizeForExcel', () => {
  it('should escape strings starting with =', () => {
    expect(sanitizeForExcel('=1+1')).toBe("'=1+1");
  });

  it('should escape strings starting with +', () => {
    expect(sanitizeForExcel('+1+1')).toBe("'+1+1");
  });

  it('should escape strings starting with -', () => {
    expect(sanitizeForExcel('-1+1')).toBe("'-1+1");
  });

  it('should escape strings starting with @', () => {
    expect(sanitizeForExcel('@SUM(1,1)')).toBe("'@SUM(1,1)");
  });

  it('should not change benign strings', () => {
    expect(sanitizeForExcel('Safe String')).toBe('Safe String');
    expect(sanitizeForExcel('123')).toBe('123');
  });

  it('should not change non-string values', () => {
    expect(sanitizeForExcel(123)).toBe(123);
    expect(sanitizeForExcel(null)).toBe(null);
    expect(sanitizeForExcel(undefined)).toBe(undefined);
    expect(sanitizeForExcel(true)).toBe(true);
  });
});
