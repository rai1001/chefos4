import { describe, it, expect } from 'vitest';
import {
    sanitizeCSVValue,
    validateHeaders,
    parseFloatSafe,
    validateFile,
} from '@/utils/csv-validator';

describe('CSV Validator Utils', () => {
    describe('sanitizeCSVValue (Security)', () => {
        it('should prepend single quote to values starting with =', () => {
            const input = '=SUM(A1:A10)';
            expect(sanitizeCSVValue(input)).toBe("'=SUM(A1:A10)");
        });

        it('should prepend single quote to values starting with +', () => {
            const input = '+10';
            expect(sanitizeCSVValue(input)).toBe("'+10");
        });

        it('should prepend single quote to values starting with -', () => {
            const input = '-10';
            expect(sanitizeCSVValue(input)).toBe("'-10");
        });

        it('should prepend single quote to values starting with @', () => {
            const input = '@SUM(1+1)';
            expect(sanitizeCSVValue(input)).toBe("'@SUM(1+1)");
        });

        it('should prepend single quote to values starting with TAB', () => {
            const input = '\tHello';
            expect(sanitizeCSVValue(input)).toBe("'\tHello");
        });

        it('should not alter safe values', () => {
            expect(sanitizeCSVValue('Safe value')).toBe('Safe value');
            expect(sanitizeCSVValue('123')).toBe('123');
            expect(sanitizeCSVValue('')).toBe('');
        });

        it('should handle whitespace before dangerous character', () => {
             // .trim() check in implementation handles this
             expect(sanitizeCSVValue(' =cmd|/C calc.exe')).toBe("' =cmd|/C calc.exe");
        });
    });

    describe('validateHeaders', () => {
        it('should validate correct headers including aliases', () => {
            const headers = ['Producto', 'Vendor', 'Price', 'Unit'];
            const required = ['nombre_articulo', 'proveedor', 'precio', 'unidad'];
            const result = validateHeaders(headers, required);
            expect(result.valid).toBe(true);
            expect(result.missing).toHaveLength(0);
        });

        it('should fail when required headers are missing', () => {
            const headers = ['Producto', 'Price'];
            const required = ['nombre_articulo', 'proveedor', 'precio', 'unidad'];
            const result = validateHeaders(headers, required);
            expect(result.valid).toBe(false);
            expect(result.missing).toContain('proveedor');
            expect(result.missing).toContain('unidad');
        });
    });

    describe('parseFloatSafe', () => {
        it('should parse simple numbers', () => {
            expect(parseFloatSafe('10.5')).toBe(10.5);
            expect(parseFloatSafe('10')).toBe(10);
        });

        it('should parse comma decimal', () => {
            expect(parseFloatSafe('10,5')).toBe(10.5);
        });

        it('should parse currency symbols', () => {
            expect(parseFloatSafe('$10.50')).toBe(10.5);
            expect(parseFloatSafe('10,50 €')).toBe(10.5);
        });

        it('should handle thousand separators', () => {
             expect(parseFloatSafe('1,234.56')).toBe(1234.56);
             expect(parseFloatSafe('1.234,56')).toBe(1234.56);
        });
    });

    describe('validateFile', () => {
         it('should accept valid csv', () => {
             const buffer = Buffer.from('a,b,c');
             const result = validateFile(buffer, 'test.csv');
             expect(result.valid).toBe(true);
         });

         it('should reject non-csv extension', () => {
             const buffer = Buffer.from('a,b,c');
             const result = validateFile(buffer, 'test.txt');
             expect(result.valid).toBe(false);
         });

         it('should reject empty file', () => {
             const buffer = Buffer.from('');
             const result = validateFile(buffer, 'test.csv');
             expect(result.valid).toBe(false);
         });
    });
});
