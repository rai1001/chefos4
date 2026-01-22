import { describe, it, expect, vi } from 'vitest';
import { processDeliveryNote, getDeliveryNotes } from '@/controllers/ocr.controller';
import { OCRService } from '@/services/ocr.service';

vi.mock('@/services/ocr.service', () => ({
    OCRService: {
        processImage: vi.fn(),
        saveDeliveryNote: vi.fn(),
        listByOrg: vi.fn(),
    },
}));

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('OCR Controller', () => {
    it('validates imageUrl', async () => {
        const req: any = { body: {}, headers: { 'x-organization-id': 'org-1' } };
        const res = mockRes();
        await processDeliveryNote(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('processes delivery note', async () => {
        const req: any = {
            body: { imageUrl: 'http://img', purchaseOrderId: 'po-1' },
            headers: { 'x-organization-id': 'org-1' },
        };
        const res = mockRes();

        (OCRService.processImage as any).mockResolvedValue({ items: [] });
        (OCRService.saveDeliveryNote as any).mockResolvedValue({ id: 'dn-1' });

        await processDeliveryNote(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ id: 'dn-1' });
    });

    it('lists delivery notes', async () => {
        const req: any = { headers: { 'x-organization-id': 'org-1' } };
        const res = mockRes();

        (OCRService.listByOrg as any).mockResolvedValue([{ id: 'dn-1' }]);

        await getDeliveryNotes(req, res);

        expect(res.json).toHaveBeenCalledWith([{ id: 'dn-1' }]);
    });
});
