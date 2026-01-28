import { describe, it, expect } from 'vitest';
import { sanitizeForExcel } from '../../src/utils/sanitizers';

describe('sanitizeForExcel', () => {
  it('should return non-string values as is', () => {
    expect(sanitizeForExcel(123)).toBe(123);
    expect(sanitizeForExcel(null)).toBe(null);
    expect(sanitizeForExcel(undefined)).toBe(undefined);
    expect(sanitizeForExcel(true)).toBe(true);
  });

  it('should return safe strings as is', () => {
    expect(sanitizeForExcel('Hello World')).toBe('Hello World');
    expect(sanitizeForExcel('123 Test')).toBe('123 Test');
  });

  it('should prepend single quote to dangerous strings', () => {
    expect(sanitizeForExcel('=1+1')).toBe("'=1+1");
    expect(sanitizeForExcel('+1+1')).toBe("'+1+1");
    expect(sanitizeForExcel('-1+1')).toBe("'-1+1");
    expect(sanitizeForExcel('@SUM(1,1)')).toBe("'@SUM(1,1)");
  });

  it('should prepend single quote to strings starting with tab or carriage return', () => {
     expect(sanitizeForExcel('\tTabbed')).toBe("'\tTabbed");
     expect(sanitizeForExcel('\rReturn')).toBe("'\rReturn");
  });
});
