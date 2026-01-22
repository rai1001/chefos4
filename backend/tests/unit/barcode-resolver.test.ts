import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BarcodeResolverService } from '@/services/barcode-resolver.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    is: vi.fn(() => ({
                        maybeSingle: vi.fn(),
                        single: vi.fn(),
                    })),
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(),
                })),
            })),
        })),
    },
}));

describe('BarcodeResolverService', () => {
    let service: BarcodeResolverService;

    beforeEach(() => {
        service = new BarcodeResolverService();
        vi.clearAllMocks();
    });

    it('resolves ingredient by barcode', async () => {
        const query = {
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'ing-1', unit_id: 'u-1' },
                    error: null,
                }),
            }),
        };

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue(query),
        } as any);

        const result = await service.resolve({ organizationId: 'org-1', barcode: '123' });
        expect(result?.id).toBe('ing-1');
    });
});
