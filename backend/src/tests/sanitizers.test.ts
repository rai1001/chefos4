import { describe, it, expect } from 'vitest';
import { sanitizeForExcel } from '../utils/sanitizers';

describe('sanitizeForExcel', () => {
    it('should prepend single quote to strings starting with =', () => {
        expect(sanitizeForExcel('=1+1')).toBe("'=1+1");
    });

    it('should prepend single quote to strings starting with +', () => {
        expect(sanitizeForExcel('+1+1')).toBe("'+1+1");
    });

    it('should prepend single quote to strings starting with -', () => {
        expect(sanitizeForExcel('-1+1')).toBe("'-1+1");
    });

    it('should prepend single quote to strings starting with @', () => {
        expect(sanitizeForExcel('@SUM(1,1)')).toBe("'@SUM(1,1)");
    });

    it('should not modify safe strings', () => {
        expect(sanitizeForExcel('Safe String')).toBe('Safe String');
        expect(sanitizeForExcel('123')).toBe('123');
    });

    it('should not modify numbers', () => {
        expect(sanitizeForExcel(123)).toBe(123);
        expect(sanitizeForExcel(-123)).toBe(-123);
    });

    it('should not modify null or undefined', () => {
        expect(sanitizeForExcel(null)).toBe(null);
        expect(sanitizeForExcel(undefined)).toBe(undefined);
    });

    it('should handle empty strings', () => {
        expect(sanitizeForExcel('')).toBe('');
    });
});
