import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeliveryEstimatorService } from '@/services/delivery-estimator.service';
import { supabase } from '@/config/supabase';

// Mock Supabase
vi.mock('@/config/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(),
                })),
            })),
        })),
    },
}));

describe('DeliveryEstimatorService', () => {
    let service: DeliveryEstimatorService;

    beforeEach(() => {
        service = new DeliveryEstimatorService();
        vi.clearAllMocks();
    });

    describe('estimateDeliveryDate', () => {
        it('should add lead time and find next delivery day (simple case)', async () => {
            // Mock supplier: Lead time 2 days, daily delivery
            const mockSupplier = {
                cut_off_time: null,
                lead_time_days: 2,
                delivery_days: [1, 2, 3, 4, 5, 6, 7],
            };

            vi.mocked(supabase.from).mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockSupplier,
                            error: null,
                        }),
                    }),
                }),
            } as any);

            // Wednesday 10:00 -> +2 days = Friday
            const orderDate = new Date('2025-01-22T10:00:00'); // 2025-01-22 is Wednesday
            const result = await service.estimateDeliveryDate('supplier-id', orderDate);

            expect(result.getDay()).toBe(5); // Friday
            expect(result.getDate()).toBe(24);
        });

        it('should skip to next day if cut-off time has passed', async () => {
            const mockSupplier = {
                cut_off_time: '11:00:00',
                lead_time_days: 2,
                delivery_days: [1, 2, 3, 4, 5, 6, 7],
            };

            vi.mocked(supabase.from).mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockSupplier,
                            error: null,
                        }),
                    }),
                }),
            } as any);

            // Wednesday 12:00 -> Past 11:00 cutoff -> Start from Thursday -> +2 biz days (Fri, Mon) = Monday
            const orderDate = new Date('2025-01-22T12:00:00');
            const result = await service.estimateDeliveryDate('supplier-id', orderDate);

            expect(result.getDay()).toBe(1); // Monday
            expect(result.getDate()).toBe(27);
        });

        it('should skip weekends when adding lead time days', async () => {
            const mockSupplier = {
                cut_off_time: null,
                lead_time_days: 3,
                delivery_days: [1, 2, 3, 4, 5, 6, 7],
            };

            vi.mocked(supabase.from).mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockSupplier,
                            error: null,
                        }),
                    }),
                }),
            } as any);

            // Thursday (23) -> +3 biz days: Fri(1), Mon(2), Tue(3)
            const orderDate = new Date('2025-01-23T10:00:00');
            const result = await service.estimateDeliveryDate('supplier-id', orderDate);

            expect(result.getDay()).toBe(2); // Tuesday
            expect(result.getDate()).toBe(28);
        });

        it('should find next valid delivery day after lead time', async () => {
            const mockSupplier = {
                cut_off_time: null,
                lead_time_days: 1,
                delivery_days: [1, 3, 5], // Mon, Wed, Fri
            };

            vi.mocked(supabase.from).mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockSupplier,
                            error: null,
                        }),
                    }),
                }),
            } as any);

            // Monday (20) -> +1 biz day = Tuesday (21). Tuesday is not delivery day. Next is Wednesday (22).
            const orderDate = new Date('2025-01-20T10:00:00');
            const result = await service.estimateDeliveryDate('supplier-id', orderDate);

            expect(result.getDay()).toBe(3); // Wednesday
            expect(result.getDate()).toBe(22);
        });

        it('should handle edge cases like only Monday delivery', async () => {
            const mockSupplier = {
                cut_off_time: null,
                lead_time_days: 0,
                delivery_days: [1], // Only Monday
            };

            vi.mocked(supabase.from).mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockSupplier,
                            error: null,
                        }),
                    }),
                }),
            } as any);

            // Tuesday (21) -> +0 biz days = Tuesday. Next delivery day is next Monday (27).
            const orderDate = new Date('2025-01-21T10:00:00');
            const result = await service.estimateDeliveryDate('supplier-id', orderDate);

            expect(result.getDay()).toBe(1); // Monday
            expect(result.getDate()).toBe(27);
        });
    });

    describe('calculateTimeUntilCutoff', () => {
        it('should return positive minutes for future cutoff', () => {
            const cutoff = '14:00:00';
            const now = new Date('2025-01-22T12:00:00');
            const diff = service.calculateTimeUntilCutoff(cutoff, now);
            expect(diff).toBe(120);
        });

        it('should return negative minutes for passed cutoff', () => {
            const cutoff = '11:00:00';
            const now = new Date('2025-01-22T12:00:00');
            const diff = service.calculateTimeUntilCutoff(cutoff, now);
            expect(diff).toBe(-60);
        });
    });
});
