import { describe, it, expect, vi } from 'vitest';
import { ReportsController } from '@/controllers/reports.controller';

vi.mock('@/services/report-generator.service', () => ({
    ReportGeneratorService: vi.fn().mockImplementation(() => ({
        generateInventoryExcel: vi.fn().mockResolvedValue(Buffer.from('inv')),
        generateProductionExcel: vi.fn().mockResolvedValue(Buffer.from('prod')),
    })),
}));

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn();
    res.send = vi.fn().mockReturnValue(res);
    return res;
};

describe('ReportsController', () => {
    it('exports inventory', async () => {
        const controller = new ReportsController();
        const req: any = { user: { organizationIds: ['org-1'] } };
        const res = mockRes();

        await controller.exportInventory(req, res);

        expect(res.setHeader).toHaveBeenCalled();
        expect(res.send).toHaveBeenCalled();
    });

    it('requires event_id', async () => {
        const controller = new ReportsController();
        const req: any = { query: {} };
        const res = mockRes();

        await controller.exportProduction(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('exports production', async () => {
        const controller = new ReportsController();
        const req: any = { query: { event_id: 'evt-1' } };
        const res = mockRes();

        await controller.exportProduction(req, res);

        expect(res.send).toHaveBeenCalled();
    });
});
