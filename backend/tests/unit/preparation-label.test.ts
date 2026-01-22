import { describe, expect, it } from 'vitest';
import { PreparationLabelService } from '@/services/preparation-label.service';

describe('PreparationLabelService', () => {
    it('generates a PDF buffer', async () => {
        const service = new PreparationLabelService();
        const buffer = await service.generateLabels({
            batchId: 'batch-1',
            preparationName: 'Salsa base',
            lotCode: 'LOT-001',
            expiryDate: '2026-01-31',
            producedAt: '2026-01-15',
            labelCount: 2,
        });

        expect(buffer.length).toBeGreaterThan(1000);
    });
});
