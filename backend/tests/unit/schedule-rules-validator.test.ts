import { describe, expect, it, vi } from 'vitest';
import { ScheduleRulesValidator } from '@/services/schedule-rules.validator';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase', () => {
    const from = vi.fn((table: string) => {
        const builder: any = {
            select: vi.fn(() => builder),
            eq: vi.fn(() => builder),
            in: vi.fn(() => builder),
            single: vi.fn(),
            maybeSingle: vi.fn(),
            then: undefined as any,
        };

        if (table === 'schedule_months') {
            builder.single = vi.fn().mockResolvedValue({
                data: {
                    id: 'month-1',
                    month: '2026-01-01',
                    organization_id: 'org-1',
                    shifts: [
                        {
                            id: 'shift-1',
                            date: '2026-01-04',
                            shift_code: 'AFTERNOON',
                            assignments: [{ id: 'assign-1', staff_id: 'staff-1' }],
                        },
                    ],
                },
                error: null,
            });
        }

        if (table === 'staff_schedule_rules') {
            builder.then = (resolve: any) =>
                resolve({
                    data: [
                        {
                            staff_id: 'staff-1',
                            allowed_shift_codes: ['MORNING'],
                            rotation_mode: 'NONE',
                            max_consecutive_days: null,
                            requires_weekend_off_per_month: true,
                        },
                    ],
                    error: null,
                });
        }

        if (table === 'organization_schedule_rules') {
            builder.maybeSingle = vi.fn().mockResolvedValue({
                data: {
                    weekend_definition: 'SAT_SUN',
                    enforce_weekend_off_hard: true,
                },
                error: null,
            });
        }

        return builder;
    });

    return { supabase: { from } };
});

describe('ScheduleRulesValidator', () => {
    it('returns errors when shift violates allowed codes', async () => {
        const validator = new ScheduleRulesValidator();
        const result = await validator.validateMonth({
            monthId: 'month-1',
            organizationIds: ['org-1'],
        });

        expect(result.errors.length).toBeGreaterThan(0);
    });
});
