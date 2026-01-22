import { describe, it, expect, vi } from 'vitest';
import { HRController } from '@/controllers/hr.controller';

vi.mock('@/services/hr.service', () => ({
    HRService: vi.fn().mockImplementation(() => ({
        createInvitation: vi.fn().mockResolvedValue({ id: 'inv-1' }),
        getEmployees: vi.fn().mockResolvedValue([{ id: 'u1' }]),
        getSchedules: vi.fn().mockResolvedValue([{ id: 's1' }]),
        upsertSchedule: vi.fn().mockResolvedValue({ id: 's1' }),
    })),
}));

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('HRController', () => {
    it('invites user', async () => {
        const controller = new HRController();
        const req: any = { user: { organizationIds: ['org-1'], id: 'u1' }, body: { email: 'a@b.com', role: 'STAFF' } };
        const res = mockRes();

        await controller.invite(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('gets employees', async () => {
        const controller = new HRController();
        const req: any = { user: { organizationIds: ['org-1'] } };
        const res = mockRes();

        await controller.getEmployees(req, res);
        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'u1' }] });
    });

    it('gets schedules', async () => {
        const controller = new HRController();
        const req: any = { user: { organizationIds: ['org-1'] }, query: { start_date: '2024-01-01', end_date: '2024-01-02' } };
        const res = mockRes();

        await controller.getSchedules(req, res);
        expect(res.json).toHaveBeenCalledWith({ data: [{ id: 's1' }] });
    });

    it('saves schedule', async () => {
        const controller = new HRController();
        const req: any = { user: { organizationIds: ['org-1'] }, body: { id: 's1' } };
        const res = mockRes();

        await controller.saveSchedule(req, res);
        expect(res.json).toHaveBeenCalledWith({ data: { id: 's1' } });
    });
});
