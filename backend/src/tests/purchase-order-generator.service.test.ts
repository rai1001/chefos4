import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PurchaseOrderGeneratorService } from '@/services/purchase-order-generator.service';
import { DemandCalculatorService } from '@/services/demand-calculator.service';
import { DeliveryEstimatorService } from '@/services/delivery-estimator.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');
vi.mock('@/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

const createChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: any) => resolve({ data, error }),
});

describe('PurchaseOrderGeneratorService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty when no demands', async () => {
        vi.spyOn(DemandCalculatorService.prototype, 'calculateEventDemand').mockResolvedValue([]);

        const service = new PurchaseOrderGeneratorService();
        const result = await service.generateFromEvent('event-1', 'org-1');

        expect(result).toEqual([]);
    });

    it('generates purchase orders and inserts items', async () => {
        vi.spyOn(DemandCalculatorService.prototype, 'calculateEventDemand').mockResolvedValue([
            {
                ingredient_id: 'ing-1',
                ingredient_name: 'Tomato',
                quantity_with_buffer: 10,
                unit_id: 'u-1',
                unit_abbr: 'kg',
            },
            {
                ingredient_id: 'ing-2',
                ingredient_name: 'Cheese',
                quantity_with_buffer: 5,
                unit_id: 'u-1',
                unit_abbr: 'kg',
            },
        ] as any);

        vi.spyOn(DeliveryEstimatorService.prototype, 'estimateDeliveryDate').mockResolvedValue(
            new Date('2026-01-25T00:00:00.000Z')
        );

        let ingredientCall = 0;
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') {
                ingredientCall += 1;
                return createChain({
                    supplier_id: 'supp-1',
                    cost_price: ingredientCall === 1 ? 2 : 3,
                });
            }
            if (table === 'suppliers') {
                return createChain({ name: 'Best Supplier' });
            }
            if (table === 'purchase_orders') {
                return createChain({ id: 'po-1' });
            }
            if (table === 'purchase_order_items') {
                return createChain([]);
            }
            return createChain([]);
        });

        const service = new PurchaseOrderGeneratorService();
        const result = await service.generateFromEvent('event-1', 'org-1');

        expect(result.length).toBe(1);
        expect(result[0].supplier_id).toBe('supp-1');
        expect(result[0].items).toHaveLength(2);
        expect(result[0].total_cost).toBe(10 * 2 + 5 * 3);
    });

    it('rolls back when inserting items fails', async () => {
        vi.spyOn(DemandCalculatorService.prototype, 'calculateEventDemand').mockResolvedValue([
            {
                ingredient_id: 'ing-1',
                ingredient_name: 'Tomato',
                quantity_with_buffer: 10,
                unit_id: 'u-1',
                unit_abbr: 'kg',
            },
        ] as any);

        vi.spyOn(DeliveryEstimatorService.prototype, 'estimateDeliveryDate').mockResolvedValue(
            new Date('2026-01-25T00:00:00.000Z')
        );

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') {
                return createChain({ supplier_id: 'supp-1', cost_price: 2 });
            }
            if (table === 'suppliers') {
                return createChain({ name: 'Best Supplier' });
            }
            if (table === 'purchase_orders') {
                return createChain({ id: 'po-1' });
            }
            if (table === 'purchase_order_items') {
                return createChain(null, new Error('Insert failed'));
            }
            return createChain([]);
        });

        const service = new PurchaseOrderGeneratorService();
        const result = await service.generateFromEvent('event-1', 'org-1');

        expect(result).toEqual([]);
    });

    it('skips supplier when PO creation fails', async () => {
        vi.spyOn(DemandCalculatorService.prototype, 'calculateEventDemand').mockResolvedValue([
            {
                ingredient_id: 'ing-1',
                ingredient_name: 'Tomato',
                quantity_with_buffer: 10,
                unit_id: 'u-1',
                unit_abbr: 'kg',
            },
        ] as any);

        vi.spyOn(DeliveryEstimatorService.prototype, 'estimateDeliveryDate').mockResolvedValue(
            new Date('2026-01-25T00:00:00.000Z')
        );

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') {
                return createChain({ supplier_id: 'supp-1', cost_price: 2 });
            }
            if (table === 'suppliers') {
                return createChain({ name: 'Best Supplier' });
            }
            if (table === 'purchase_orders') {
                return createChain(null, new Error('Insert failed'));
            }
            if (table === 'purchase_order_items') {
                return createChain([]);
            }
            return createChain([]);
        });

        const service = new PurchaseOrderGeneratorService();
        const result = await service.generateFromEvent('event-1', 'org-1');

        expect(result).toEqual([]);
    });

    it('checkStockAvailability returns missing ingredients', async () => {
        vi.spyOn(DemandCalculatorService.prototype, 'calculateEventDemand').mockResolvedValue([
            {
                ingredient_id: 'ing-1',
                ingredient_name: 'Tomato',
                quantity_with_buffer: 10,
            },
        ] as any);

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') {
                return createChain({ stock_current: 2 });
            }
            return createChain([]);
        });

        const service = new PurchaseOrderGeneratorService();
        const result = await service.checkStockAvailability('event-1');

        expect(result.has_sufficient_stock).toBe(false);
        expect(result.missing_ingredients).toHaveLength(1);
        expect(result.missing_ingredients[0].shortage).toBe(8);
    });

    it('checkStockAvailability returns sufficient when stocks cover demand', async () => {
        vi.spyOn(DemandCalculatorService.prototype, 'calculateEventDemand').mockResolvedValue([
            {
                ingredient_id: 'ing-1',
                ingredient_name: 'Tomato',
                quantity_with_buffer: 10,
            },
        ] as any);

        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'ingredients') {
                return createChain({ stock_current: 15 });
            }
            return createChain([]);
        });

        const service = new PurchaseOrderGeneratorService();
        const result = await service.checkStockAvailability('event-1');

        expect(result.has_sufficient_stock).toBe(true);
        expect(result.missing_ingredients).toHaveLength(0);
    });
});
