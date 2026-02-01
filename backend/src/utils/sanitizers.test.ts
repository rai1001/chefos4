import { describe, it, expect } from 'vitest';
import { sanitizeForExcel } from './sanitizers';

describe('sanitizeForExcel', () => {
    it('should return null for null or undefined', () => {
        expect(sanitizeForExcel(null)).toBeNull();
        expect(sanitizeForExcel(undefined)).toBeNull();
    });

    it('should return numbers as is', () => {
        expect(sanitizeForExcel(123)).toBe(123);
        expect(sanitizeForExcel(0)).toBe(0);
        expect(sanitizeForExcel(-123.45)).toBe(-123.45);
    });

    it('should return safe strings as is', () => {
        expect(sanitizeForExcel('hello')).toBe('hello');
        expect(sanitizeForExcel('123 world')).toBe('123 world');
    });

    it('should escape strings starting with =', () => {
        expect(sanitizeForExcel('=1+1')).toBe("'=1+1");
    });

    it('should escape strings starting with +', () => {
        expect(sanitizeForExcel('+1+1')).toBe("'+1+1");
    });

    it('should escape strings starting with -', () => {
        // Note: Numbers are handled separately, but if it's passed as a string starting with -, it should be escaped
        // unless we are sure it's a number. But sanitizeForExcel treats 'number' type as safe.
        // A string "-1+1" is dangerous. A number -1 is safe.
        expect(sanitizeForExcel('-1+1')).toBe("'-1+1");
    });

    it('should escape strings starting with @', () => {
        expect(sanitizeForExcel('@SUM(A1:A5)')).toBe("'@SUM(A1:A5)");
    });

    it('should handle boolean values as strings', () => {
        expect(sanitizeForExcel(true)).toBe('true');
        expect(sanitizeForExcel(false)).toBe('false');
    });
});
