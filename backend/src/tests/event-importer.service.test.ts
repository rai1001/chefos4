import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventImporterService } from '@/services/event-importer.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const csvBuffer = Buffer.from(
    'Nombre Evento,Tipo,Fecha Inicio,Fecha Fin,Pax,Recetas\nEvento 1,BANQUET,2024-01-01,2024-01-02,50,Paella:10\n'
);
const csvBufferLower = Buffer.from(
    'nombre_evento,tipo,fecha_inicio,fecha_fin,pax,recetas\nEvento 1,BANQUET,2024-01-01,2024-01-02,50,Paella:10\n'
);

const createChain = (data: any) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    then: (resolve: any) => resolve({ data, error: null }),
});

describe('EventImporterService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('analyzes CSV', async () => {
        const service = new EventImporterService();
        const result = await service.analyzeCSV(csvBuffer, 'org-1');
        expect(result.total_rows).toBe(1);
    });

    it('analyzes CSV with lowercase headers', async () => {
        const service = new EventImporterService();
        const result = await service.analyzeCSV(csvBufferLower, 'org-1');
        expect(result.total_rows).toBe(1);
        expect(result.preview[0].nombre_evento).toBe('Evento 1');
    });
    it('executes import', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e1' }) as any;
            if (table === 'recipes') return createChain({ id: 'r1' }) as any;
            if (table === 'event_menus') return createChain({}) as any;
            return createChain({}) as any;
        });

        const service = new EventImporterService();
        const result = await service.executeImport(csvBuffer, 'org-1');
        expect(result.imported).toBe(1);
    });

    it('executes import without recetas', async () => {
        const buffer = Buffer.from(
            'Nombre Evento,Tipo,Fecha Inicio,Fecha Fin,Pax,Recetas\nEvento 1,,2024-01-01,,,\n'
        );
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e1' }) as any;
            return createChain({}) as any;
        });

        const service = new EventImporterService();
        const result = await service.executeImport(buffer, 'org-1');
        expect(result.imported).toBe(1);
    });

    it('records error when event insert fails', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') {
                const chain = createChain(null) as any;
                chain.single = vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') });
                return chain;
            }
            return createChain({}) as any;
        });

        const service = new EventImporterService();
        const result = await service.executeImport(csvBuffer, 'org-1');
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('skips rows with missing required fields', async () => {
        const badBuffer = Buffer.from(
            'Nombre Evento,Tipo,Fecha Inicio,Fecha Fin,Pax,Recetas\n, BANQUET,,2024-01-02,50,\n'
        );
        vi.spyOn(supabase, 'from').mockReturnValue(createChain({}) as any);

        const service = new EventImporterService();
        const result = await service.executeImport(badBuffer, 'org-1');
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('processEventMenus ignores unknown recipes', async () => {
        const service: any = new EventImporterService();
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain(null) as any;
            if (table === 'event_menus') return createChain({}) as any;
            return createChain({}) as any;
        });

        await service.processEventMenus('e1', 'Unknown:5', 'org-1');
        expect((fromSpy as any).mock.calls.length).toBeGreaterThan(0);
    });

    it('processEventMenus inserts when recipe found', async () => {
        const service: any = new EventImporterService();
        const menuChain = createChain({}) as any;
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'recipes') return createChain({ id: 'r1' }) as any;
            if (table === 'event_menus') return menuChain;
            return createChain({}) as any;
        });

        await service.processEventMenus('e1', 'Paella:3, Gazpacho', 'org-1');

        expect(menuChain.insert).toHaveBeenCalledTimes(2);
        expect(menuChain.insert).toHaveBeenCalledWith({
            event_id: 'e1',
            recipe_id: 'r1',
            qty_forecast: 3,
        });
        expect(menuChain.insert).toHaveBeenCalledWith({
            event_id: 'e1',
            recipe_id: 'r1',
            qty_forecast: 1,
        });
    });

    it('maps event type', () => {
        const service: any = new EventImporterService();
        expect(service.mapEventType('coffee break')).toBe('COFFEE');
        expect(service.mapEventType('buffet')).toBe('BUFFET');
        expect(service.mapEventType('buffet deluxe')).toBe('BUFFET');
        expect(service.mapEventType('carta')).toBe('A_LA_CARTE');
        expect(service.mapEventType('BANQUET')).toBe('BANQUET');
        expect(service.mapEventType('unknown')).toBe('BANQUET');
    });
});
