import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemandCalculatorService } from '@/services/demand-calculator.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    then: (resolve: any) => resolve({ data, error: null }),
});

describe('DemandCalculatorService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calculates demand for banquet event', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e1', event_type: 'BANQUET', pax: 10 }) as any;
            if (table === 'event_menus') {
                return createChain([
                    {
                        recipe: {
                            servings: 2,
                            recipe_ingredients: [
                                {
                                    quantity: 4,
                                    ingredient: { id: 'i1', name: 'Ing', family_id: 'f1' },
                                    unit: { id: 'u1', abbreviation: 'kg' },
                                },
                            ],
                        },
                    },
                ]) as any;
            }
            if (table === 'ingredients') {
                return createChain({ family: { safety_buffer_pct: 1.1 } }) as any;
            }
            return createChain({}) as any;
        });

        const service = new DemandCalculatorService();
        const result = await service.calculateEventDemand('e1');
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].quantity_with_buffer).toBeGreaterThan(0);
    });

    it('calculates demand for a la carte event using forecast', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e2', event_type: 'A_LA_CARTE', pax: 10 }) as any;
            if (table === 'event_menus') {
                return createChain([
                    {
                        qty_forecast: 5,
                        recipe: {
                            servings: 1,
                            recipe_ingredients: [
                                {
                                    quantity: 2,
                                    ingredient: { id: 'i2', name: 'Ing2', family_id: 'f1' },
                                    unit: { id: 'u1', abbreviation: 'kg' },
                                },
                            ],
                        },
                    },
                ]) as any;
            }
            if (table === 'ingredients') {
                return createChain({ family: { safety_buffer_pct: 1.2 } }) as any;
            }
            return createChain({}) as any;
        });

        const service = new DemandCalculatorService();
        const result = await service.calculateEventDemand('e2');
        expect(result[0].quantity_with_buffer).toBeCloseTo(12, 2);
    });

    it('returns empty when a la carte menus are missing', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e6', event_type: 'A_LA_CARTE', pax: 10 }) as any;
            if (table === 'event_menus') return createChain(null) as any;
            return createChain({}) as any;
        });

        const service = new DemandCalculatorService();
        const result = await service.calculateEventDemand('e6');
        expect(result).toEqual([]);
    });

    it('calculates demand for sports multi event including direct ingredients', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e3', event_type: 'SPORTS_MULTI', pax: 10 }) as any;
            if (table === 'event_direct_ingredients') {
                return createChain([
                    {
                        quantity: 3,
                        ingredient: { id: 'i3', name: 'Direct', family_id: 'f1' },
                        unit: { id: 'u1', abbreviation: 'kg' },
                    },
                ]) as any;
            }
            if (table === 'event_menus') {
                return createChain([
                    {
                        recipe: {
                            servings: 2,
                            recipe_ingredients: [
                                {
                                    quantity: 4,
                                    ingredient: { id: 'i4', name: 'Banquet', family_id: 'f1' },
                                    unit: { id: 'u1', abbreviation: 'kg' },
                                },
                            ],
                        },
                    },
                ]) as any;
            }
            if (table === 'ingredients') {
                return createChain({ family: { safety_buffer_pct: 1.1 } }) as any;
            }
            return createChain({}) as any;
        });

        const service = new DemandCalculatorService();
        const result = await service.calculateEventDemand('e3');
        expect(result.length).toBeGreaterThan(1);
    });

    it('returns empty when banquet menus are missing', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e4', event_type: 'COFFEE', pax: 10 }) as any;
            if (table === 'event_menus') return createChain(null) as any;
            return createChain({}) as any;
        });

        const service = new DemandCalculatorService();
        const result = await service.calculateEventDemand('e4');
        expect(result).toEqual([]);
    });

    it('applies default buffer and aggregates duplicate ingredients', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain({ id: 'e5', event_type: 'OTHER', pax: 4 }) as any;
            if (table === 'event_menus') {
                return createChain([
                    {
                        recipe: {
                            servings: 2,
                            recipe_ingredients: [
                                {
                                    quantity: 2,
                                    ingredient: { id: 'i1', name: 'Ing', family_id: 'f1' },
                                    unit: { id: 'u1', abbreviation: 'kg' },
                                },
                            ],
                        },
                    },
                    {
                        recipe: {
                            servings: 2,
                            recipe_ingredients: [
                                {
                                    quantity: 2,
                                    ingredient: { id: 'i1', name: 'Ing', family_id: 'f1' },
                                    unit: { id: 'u1', abbreviation: 'kg' },
                                },
                            ],
                        },
                    },
                ]) as any;
            }
            if (table === 'ingredients') {
                return createChain({ family: null }) as any;
            }
            return createChain({}) as any;
        });

        const service = new DemandCalculatorService();
        const result = await service.calculateEventDemand('e5');
        expect(result[0].quantity_needed).toBe(8);
        expect(result[0].quantity_with_buffer).toBeCloseTo(8 * 1.1, 2);
    });

    it('throws when event is not found', async () => {
        const fromSpy = vi.spyOn(supabase, 'from');
        fromSpy.mockImplementation((table: string) => {
            if (table === 'events') return createChain(null) as any;
            return createChain({}) as any;
        });

        const service = new DemandCalculatorService();
        await expect(service.calculateEventDemand('missing')).rejects.toThrow('Event not found');
    });
});
