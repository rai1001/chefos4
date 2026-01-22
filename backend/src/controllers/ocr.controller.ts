import { Request, Response } from 'express';
import { OCRService } from '../services/ocr.service';

export const processDeliveryNote = async (req: Request, res: Response) => {
    try {
        const { imageUrl, purchaseOrderId } = req.body;
        const organizationId = req.headers['x-organization-id'] as string;

        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        // 1. Process with OCR
        const extractedData = await OCRService.processImage(imageUrl);

        // 2. Save to database
        const deliveryNote = await OCRService.saveDeliveryNote({
            organization_id: organizationId,
            purchase_order_id: purchaseOrderId,
            image_url: imageUrl,
            extracted_data: extractedData
        });

        res.status(201).json(deliveryNote);
    } catch (error: any) {
        console.error('OCR Controller Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getDeliveryNotes = async (req: Request, res: Response) => {
    try {
        const organizationId = req.headers['x-organization-id'] as string;
        const notes = await OCRService.listByOrg(organizationId);
        res.json(notes);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
