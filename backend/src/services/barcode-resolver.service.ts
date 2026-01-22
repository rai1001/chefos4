import { supabase } from '@/config/supabase';

export class BarcodeResolverService {
    async resolve(params: {
        organizationId: string;
        barcode?: string;
        ingredientId?: string;
        saveBarcode?: boolean;
    }) {
        const { organizationId, barcode, ingredientId, saveBarcode } = params;

        if (barcode) {
            const { data: ingredientByBarcode, error } = await supabase
                .from('ingredients')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('barcode', barcode)
                .is('deleted_at', null)
                .maybeSingle();

            if (error) throw error;
            if (ingredientByBarcode) return ingredientByBarcode;
        }

        if (ingredientId) {
            const { data: ingredient, error } = await supabase
                .from('ingredients')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('id', ingredientId)
                .is('deleted_at', null)
                .single();

            if (error) throw error;

            if (barcode && saveBarcode) {
                const { error: updateError } = await supabase
                    .from('ingredients')
                    .update({ barcode })
                    .eq('id', ingredientId)
                    .eq('organization_id', organizationId);

                if (updateError) throw updateError;
            }

            return ingredient;
        }

        return null;
    }
}
