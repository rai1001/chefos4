import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HRService } from '@/services/hr.service';
import { supabase } from '@/config/supabase';

vi.mock('@/config/supabase');

const createChain = (data: any) => ({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    then: (resolve: any) => resolve({ data, error: null }),
});

describe('HRService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates invitation', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 'inv-1' }) as any);
        const service = new HRService();
        const result = await service.createInvitation('a@b.com', 'STAFF', 'org-1', 'u1');
        expect(result).toEqual({ id: 'inv-1' });
    });

    it('gets employees', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 'u1' }]) as any);
        const service = new HRService();
        const result = await service.getEmployees('org-1');
        expect(result).toEqual([{ id: 'u1' }]);
    });

    it('upserts schedule', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain({ id: 's1' }) as any);
        const service = new HRService();
        const result = await service.upsertSchedule('org-1', { id: 's1' });
        expect(result).toEqual({ id: 's1' });
    });

    it('gets schedules', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(createChain([{ id: 's1' }]) as any);
        const service = new HRService();
        const result = await service.getSchedules('org-1', '2024-01-01', '2024-01-02');
        expect(result).toEqual([{ id: 's1' }]);
    });
});
