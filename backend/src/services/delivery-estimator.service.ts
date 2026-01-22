import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export class DeliveryEstimatorService {
    async estimateDeliveryDate(
        supplierId: string,
        orderDateTime: Date = new Date()
    ): Promise<Date> {
        try {
            const { data: supplier, error } = await supabase
                .from('suppliers')
                .select('cut_off_time, lead_time_days, delivery_days')
                .eq('id', supplierId)
                .single();

            if (error || !supplier) throw new Error('Supplier not found');

            let currentDate = new Date(orderDateTime);
            const currentTime = orderDateTime.toTimeString().slice(0, 8);

            if (supplier.cut_off_time && currentTime >= supplier.cut_off_time) {
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const leadTimeDays = supplier.lead_time_days || 2;
            let daysAdded = 0;
            while (daysAdded < leadTimeDays) {
                currentDate.setDate(currentDate.getDate() + 1);
                const day = currentDate.getDay();
                if (day !== 0 && day !== 6) daysAdded++;
            }

            const deliveryDays = supplier.delivery_days || [1, 2, 3, 4, 5];
            let attempts = 0;
            while (attempts < 14) {
                let dayOfWeek = currentDate.getDay();
                if (dayOfWeek === 0) dayOfWeek = 7;
                if (deliveryDays.includes(dayOfWeek)) break;
                currentDate.setDate(currentDate.getDate() + 1);
                attempts++;
            }

            currentDate.setHours(0, 0, 0, 0);
            return currentDate;
        } catch (error) {
            logger.error('Error estimating delivery:', error);
            throw error;
        }
    }

    calculateTimeUntilCutoff(cutOffTime: string, currentTime: Date = new Date()): number {
        const [h, m, s] = cutOffTime.split(':').map(Number);
        const cutoff = new Date(currentTime);
        cutoff.setHours(h, m, s, 0);
        return Math.floor((cutoff.getTime() - currentTime.getTime()) / 60000);
    }

    isDeliveryDayToday(deliveryDays: number[]): boolean {
        let today = new Date().getDay();
        if (today === 0) today = 7;
        return deliveryDays.includes(today);
    }
}
