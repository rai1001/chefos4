
import { useQuery } from "@tanstack/react-query";
import { suppliersService } from "@/services/suppliers.service";
import { subDays, isBefore, addDays } from "date-fns";

export function useEventDeadlines(eventId: string) {
    return useQuery({
        queryKey: ["event-deadlines", eventId],
        queryFn: async () => {
            // 1. Get event demand (backend calculated)
            const res = await fetch(`/api/v1/events/${eventId}/calculate-demand`).then(r => r.json());
            const event = res.event;
            const demands = res.demands;

            const suppliersRes = await suppliersService.getAll();
            const suppliers = suppliersRes.data;

            let criticalDeadline: Date | null = null;

            demands.forEach((demand: any) => {
                const supplier = suppliers.find((s: any) => s.id === demand.supplier_id);
                if (supplier) {
                    const eventDate = new Date(event.date_start);
                    const deadline = subDays(eventDate, supplier.lead_time_days + 1);

                    if (!criticalDeadline || isBefore(deadline, criticalDeadline)) {
                        criticalDeadline = deadline;
                    }
                }
            });

            return {
                criticalDeadline,
                isUrgent: criticalDeadline ? isBefore(criticalDeadline, addDays(new Date(), 2)) : false,
                hasPassed: criticalDeadline ? isBefore(criticalDeadline, new Date()) : false
            };
        },
        enabled: !!eventId
    });
}
