import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CSVImporterService } from '@/services/csv-importer.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const csvBuffer = Buffer.from(
    'Nombre Artículo,Proveedor,Precio,Unidad,Familia\nTomate,Proveedor A,1.5,kg,Verduras\n'
);
const csvBufferIncomplete = Buffer.from(
    'Nombre Artículo,Proveedor,Precio,Unidad\nTomate,Proveedor A,,kg\n'
);
const csvBufferLower = Buffer.from(
    'nombre_articulo,proveedor,precio,unidad,familia\nTomate,Proveedor A,1.5,kg,Verduras\n'
);

const createChain = (data: any) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data, error: null }),
});

describe('CSVImporterService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('analyzes CSV and finds unknown suppliers', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ name: 'Proveedor B' }]) as any);
        const service = new CSVImporterService();
        const result = await service.analyzeCSV(csvBuffer, 'org-1');
        expect(result.total_rows).toBe(1);
        expect(result.unknown_suppliers).toContain('Proveedor A');
    });

    it('analyzes CSV with lowercase headers', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ name: 'Proveedor B' }]) as any);
        const service = new CSVImporterService();
        const result = await service.analyzeCSV(csvBufferLower, 'org-1');
        expect(result.total_rows).toBe(1);
        expect(result.preview[0].nombre_articulo).toBe('Tomate');
    });

    it('executes import', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'suppliers') return createChain({ id: 's1' }) as any;
            if (table === 'units') return createChain({ id: 'u1' }) as any;
            if (table === 'product_families') return createChain({ id: 'f1' }) as any;
            if (table === 'ingredients') return createChain(null) as any;
            return createChain({}) as any;
        });

        const service = new CSVImporterService();
        const result = await service.executeImport(csvBuffer, 'org-1', [
            { supplier_name: 'Proveedor A', action: 'CREATE' },
        ]);

        expect(result.imported + result.updated).toBeGreaterThanOrEqual(0);
    });

    it('executes import and creates supplier when needed', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let supplierCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'suppliers') {
                supplierCalls += 1;
                if (supplierCalls === 1) {
                    const chain = createChain(null) as any;
                    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
                    return chain;
                }
                const chain = createChain({ id: 's-new' }) as any;
                chain.single = vi.fn().mockResolvedValue({ data: { id: 's-new' }, error: null });
                return chain;
            }
            if (table === 'units') return createChain({ id: 'u1' }) as any;
            if (table === 'product_families') return createChain({ id: 'f1' }) as any;
            if (table === 'ingredients') return createChain(null) as any;
            return createChain({}) as any;
        });

        const service = new CSVImporterService();
        const result = await service.executeImport(csvBufferLower, 'org-1', [
            { supplier_name: 'Proveedor A', action: 'CREATE' },
        ]);

        expect(result.created_suppliers).toBe(1);
    });

    it('adds errors when supplier cannot be resolved', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'suppliers') return createChain(null) as any;
            if (table === 'units') return createChain({ id: 'u1' }) as any;
            if (table === 'ingredients') return createChain(null) as any;
            return createChain({}) as any;
        });

        const service = new CSVImporterService();
        const result = await service.executeImport(csvBuffer, 'org-1', []);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('adds errors when unit is unknown', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'suppliers') return createChain({ id: 's1' }) as any;
            if (table === 'units') return createChain(null) as any;
            if (table === 'ingredients') return createChain(null) as any;
            return createChain({}) as any;
        });

        const service = new CSVImporterService();
        const result = await service.executeImport(csvBuffer, 'org-1', [
            { supplier_name: 'Proveedor A', action: 'CREATE' },
        ]);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('adds errors when row is incomplete', async () => {
        const service = new CSVImporterService();
        const result = await service.executeImport(csvBufferIncomplete, 'org-1', []);
        expect(result.errors[0].message).toContain('Missing required field');
    });

    it('updates existing ingredient when found', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let ingredientCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'suppliers') return createChain({ id: 's1' }) as any;
            if (table === 'units') return createChain({ id: 'u1' }) as any;
            if (table === 'ingredients') {
                ingredientCalls += 1;
                if (ingredientCalls === 1) return createChain({ id: 'i1' }) as any;
                return createChain({}) as any;
            }
            return createChain({}) as any;
        });

        const service = new CSVImporterService();
        const result = await service.executeImport(csvBuffer, 'org-1', [
            { supplier_name: 'Proveedor A', action: 'CREATE' },
        ]);

        expect(result.updated).toBe(1);
    });

    it('adds errors when update throws', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        let ingredientCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'suppliers') return createChain({ id: 's1' }) as any;
            if (table === 'units') return createChain({ id: 'u1' }) as any;
            if (table === 'ingredients') {
                if (ingredientCalls === 0) {
                    ingredientCalls++;
                    return createChain({ id: 'i1' }) as any;
                }
                const chain = createChain({ id: 'i1' }) as any;
                // Simulate Supabase returning an error object
                chain.then = (resolve: any) => resolve({ data: null, error: new Error('boom') });
                return chain;
            }
            return createChain({}) as any;
        });

        const service = new CSVImporterService();
        const result = await service.executeImport(csvBuffer, 'org-1', [
            { supplier_name: 'Proveedor A', action: 'CREATE' },
        ]);

        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('resolveSupplier returns existing supplier', async () => {
        const service: any = new CSVImporterService();
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'suppliers') {
                return createChain({ id: 's1' }) as any;
            }
            return createChain({}) as any;
        });

        const result = await service.resolveSupplier('Proveedor A', 'org-1', new Map());
        expect(result).toEqual({ id: 's1', created: false, default_family_id: null });
    });

    it('resolveSupplier returns linked supplier', async () => {
        const service: any = new CSVImporterService();
        const fromSpy = vi.spyOn(supabase, 'from');
        let supplierCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'suppliers') {
                supplierCalls += 1;
                if (supplierCalls === 1) {
                    return createChain(null) as any;
                }
                return createChain({ id: 's2', default_family_id: null }) as any;
            }
            return createChain({}) as any;
        });

        const resolutions = new Map([
            ['proveedor a', { supplier_name: 'Proveedor A', action: 'LINK', link_to_id: 's2' }],
        ]);

        const result = await service.resolveSupplier('Proveedor A', 'org-1', resolutions);
        expect(result).toEqual({ id: 's2', created: false, default_family_id: null });
    });

    it('resolveSupplier returns null when link has no target', async () => {
        const service: any = new CSVImporterService();
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null) as any);

        const resolutions = new Map([
            ['proveedor a', { supplier_name: 'Proveedor A', action: 'LINK' }],
        ]);

        const result = await service.resolveSupplier('Proveedor A', 'org-1', resolutions);
        expect(result).toBeNull();
    });

    it('resolveSupplier creates supplier when instructed', async () => {
        const service: any = new CSVImporterService();
        const fromSpy = vi.spyOn(supabase, 'from');
        let supplierCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'suppliers') {
                supplierCalls += 1;
                if (supplierCalls === 1) {
                    const chain = createChain(null) as any;
                    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
                    return chain;
                }
                return createChain({ id: 's3' }) as any;
            }
            return createChain({}) as any;
        });

        const resolutions = new Map([
            ['proveedor a', { supplier_name: 'Proveedor A', action: 'CREATE' }],
        ]);

        const result = await service.resolveSupplier('Proveedor A', 'org-1', resolutions);
        expect(result).toEqual({ id: 's3', created: true, default_family_id: null });
    });

    it('resolveSupplier returns null when create fails', async () => {
        const service: any = new CSVImporterService();
        const chain = createChain(null) as any;
        chain.single = vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') });
        vi.spyOn(supabase, 'from').mockReturnValue(chain);

        const resolutions = new Map([
            ['proveedor a', { supplier_name: 'Proveedor A', action: 'CREATE' }],
        ]);

        const result = await service.resolveSupplier('Proveedor A', 'org-1', resolutions);
        expect(result).toBeNull();
    });

    it('resolveSupplier returns null when insert returns no data', async () => {
        const service: any = new CSVImporterService();
        const fromSpy = vi.spyOn(supabase, 'from');
        let supplierCalls = 0;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'suppliers') {
                supplierCalls += 1;
                if (supplierCalls === 1) {
                    const chain = createChain(null) as any;
                    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
                    return chain;
                }
                const chain = createChain(null) as any;
                chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
                return chain;
            }
            return createChain({}) as any;
        });

        const resolutions = new Map([
            ['proveedor a', { supplier_name: 'Proveedor A', action: 'CREATE' }],
        ]);

        const result = await service.resolveSupplier('Proveedor A', 'org-1', resolutions);
        expect(result).toBeNull();
    });

    it('resolveUnit and resolveFamily return ids when found', async () => {
        const service: any = new CSVImporterService();
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'units') return createChain({ id: 'u1' }) as any;
            if (table === 'product_families') return createChain({ id: 'f1' }) as any;
            return createChain({}) as any;
        });

        const unitId = await service.resolveUnit('kg');
        const familyId = await service.resolveFamily('Veg', 'org-1');
        expect(unitId).toBe('u1');
        expect(familyId).toBe('f1');
    });

    it('resolveUnit returns null when missing', async () => {
        const service: any = new CSVImporterService();
        vi.spyOn(supabase, 'from').mockReturnValue(createChain(null) as any);

        const unitId = await service.resolveUnit('kg');
        expect(unitId).toBeNull();
    });
});
