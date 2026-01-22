import { supabase } from '../config/supabase';

export interface ExtractedItem {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

export interface OCRResult {
    supplier_name?: string;
    date?: string;
    total_amount?: number;
    items: ExtractedItem[];
}

export class OCRService {
    /**
     * Processes an image URL through OCR and returns extracted data.
     * For now, this returns mock data to simulate the Vision API.
     */
    static async processImage(imageUrl: string): Promise<OCRResult> {
        console.log(`Processing image: ${imageUrl}`);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Mock extraction result
        return {
            supplier_name: "PESCADOS GARCIA",
            date: new Date().toISOString().split('T')[0],
            total_amount: 145.50,
            items: [
                { description: "Rodaballo Salvaje 2-3kg", quantity: 5, unit_price: 22.50, total: 112.50 },
                { description: "Cigala Tronco G", quantity: 1, unit_price: 33.00, total: 33.00 }
            ]
        };
    }

    static async processMenuImage(imageUrl: string): Promise<{ items: { recipe_name: string; quantity: number }[] }> {
        console.log(`Processing MENU image: ${imageUrl}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Mock menu extraction
        return {
            items: [
                { recipe_name: "Paella de Marisco", quantity: 50 },
                { recipe_name: "Gazpacho Andaluz", quantity: 30 },
                { recipe_name: "Fideuá", quantity: 20 }
            ]
        };
    }

    static async saveDeliveryNote(data: {
        organization_id: string;
        purchase_order_id?: string;
        image_url: string;
        extracted_data: OCRResult;
    }) {
        const { data: note, error } = await supabase
            .from('delivery_notes')
            .insert([{
                organization_id: data.organization_id,
                purchase_order_id: data.purchase_order_id,
                image_url: data.image_url,
                extracted_data: data.extracted_data,
                status: 'PENDING_REVIEW',
                total_amount: data.extracted_data.total_amount
            }])
            .select()
            .single();

        if (error) throw error;
        return note;
    }

    static async listByOrg(organizationId: string) {
        const { data, error } = await supabase
            .from('delivery_notes')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }
}
