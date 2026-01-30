import { describe, it, expect } from 'vitest';
import { sanitizeForExcel } from '../../src/utils/sanitizers';

describe('Sanitizers', () => {
    describe('sanitizeForExcel', () => {
        it('should return empty string for null or undefined', () => {
            expect(sanitizeForExcel(null)).toBe('');
            expect(sanitizeForExcel(undefined)).toBe('');
        });

        it('should return the original string if it is safe', () => {
            expect(sanitizeForExcel('Safe String')).toBe('Safe String');
            expect(sanitizeForExcel('12345')).toBe('12345');
        });

        it('should prepend a quote for strings starting with =', () => {
            expect(sanitizeForExcel('=1+1')).toBe("'=1+1");
        });

        it('should prepend a quote for strings starting with +', () => {
            expect(sanitizeForExcel('+1+1')).toBe("'+1+1");
        });

        it('should prepend a quote for strings starting with -', () => {
            expect(sanitizeForExcel('-1+1')).toBe("'-1+1");
        });

        it('should prepend a quote for strings starting with @', () => {
            expect(sanitizeForExcel('@SUM(1+1)')).toBe("'@SUM(1+1)");
        });

        it('should prepend a quote for strings starting with tab', () => {
            expect(sanitizeForExcel('\tTabbed')).toBe("'\tTabbed");
        });

        it('should prepend a quote for strings starting with carriage return', () => {
            expect(sanitizeForExcel('\rReturned')).toBe("'\rReturned");
        });
    });
});
