import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PurchaseCalculatorService } from '@/services/purchase-calculator.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
});

describe('PurchaseCalculatorService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calculates purchase quantity with buffer', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(
            createChain({ name: 'Ing', product_families: { safety_buffer_pct: 1.2 } }) as any
        );
        const service = new PurchaseCalculatorService();
        const qty = await service.calculatePurchaseQuantity({ ingredientId: 'i1', quantity: 10, unitId: 'u1' });
        expect(qty).toBeGreaterThan(10);
    });

    it('uses default buffer when no family is present', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(
            createChain({ name: 'Ing', product_families: null }) as any
        );
        const service = new PurchaseCalculatorService();
        const qty = await service.calculatePurchaseQuantity({ ingredientId: 'i1', quantity: 10, unitId: 'u1' });
        expect(qty).toBe(11);
    });

    it('throws when ingredient not found', async () => {
        const chain = createChain(null);
        chain.single = vi.fn().mockResolvedValue({ data: null, error: new Error('missing') });
        vi.spyOn(supabase, 'from').mockReturnValue(chain as any);

        const service = new PurchaseCalculatorService();
        await expect(
            service.calculatePurchaseQuantity({ ingredientId: 'missing', quantity: 10, unitId: 'u1' })
        ).rejects.toThrow('Ingredient not found');
    });

    it('generatePurchaseOrderForEvent throws not implemented', async () => {
        const service = new PurchaseCalculatorService();
        await expect(service.generatePurchaseOrderForEvent('event-1')).rejects.toThrow('Not implemented yet');
    });
});
