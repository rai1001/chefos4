import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OCRService } from '@/services/ocr.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any) => ({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data, error: null }),
});

describe('OCRService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('processImage returns mock data', async () => {
        vi.useFakeTimers();
        const promise = OCRService.processImage('http://img');
        vi.runAllTimers();
        const result = await promise;
        expect(result.items.length).toBeGreaterThan(0);
        vi.useRealTimers();
    });

    it('processMenuImage returns mock menu data', async () => {
        vi.useFakeTimers();
        const promise = OCRService.processMenuImage('http://menu');
        vi.runAllTimers();
        const result = await promise;
        expect(result.items.length).toBeGreaterThan(0);
        vi.useRealTimers();
    });

    it('saves delivery note', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'dn-1' }) as any);
        const result = await OCRService.saveDeliveryNote({
            organization_id: 'org-1',
            image_url: 'http://img',
            extracted_data: { items: [] },
        });
        expect(result).toEqual({ id: 'dn-1' });
    });

    it('lists by org', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'dn-1' }]) as any);
        const result = await OCRService.listByOrg('org-1');
        expect(result).toEqual([{ id: 'dn-1' }]);
    });
});
