import { describe, expect, it } from 'vitest';
import { sanitizeForExcel } from '@/utils/sanitizers';

describe('sanitizeForExcel', () => {
    it('should prepend a single quote to strings starting with =', () => {
        expect(sanitizeForExcel('=1+1')).toBe("'=1+1");
    });

    it('should prepend a single quote to strings starting with +', () => {
        expect(sanitizeForExcel('+1+1')).toBe("'+1+1");
    });

    it('should prepend a single quote to strings starting with -', () => {
        expect(sanitizeForExcel('-1+1')).toBe("'-1+1");
    });

    it('should prepend a single quote to strings starting with @', () => {
        expect(sanitizeForExcel('@SUM(A1:A5)')).toBe("'@SUM(A1:A5)");
    });

    it('should prepend a single quote to strings starting with tab', () => {
        expect(sanitizeForExcel('\tmalicious')).toBe("'\tmalicious");
    });

    it('should prepend a single quote to strings starting with carriage return', () => {
        expect(sanitizeForExcel('\rmalicious')).toBe("'\rmalicious");
    });

    it('should not modify safe strings', () => {
        expect(sanitizeForExcel('Safe String')).toBe('Safe String');
        expect(sanitizeForExcel('123')).toBe('123');
    });

    it('should not modify non-string values', () => {
        expect(sanitizeForExcel(123)).toBe(123);
        expect(sanitizeForExcel(null)).toBe(null);
        expect(sanitizeForExcel(undefined)).toBe(undefined);
        expect(sanitizeForExcel(true)).toBe(true);
    });

    it('should handle empty strings', () => {
        expect(sanitizeForExcel('')).toBe('');
    });
});
