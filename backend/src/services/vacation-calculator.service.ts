export type VacationPolicy = 'CALENDAR' | 'BUSINESS';

export class VacationCalculatorService {
    private parseDate(input: string) {
        return new Date(`${input}T00:00:00Z`);
    }

    calculateDays(startDate: string, endDate: string, policy: VacationPolicy = 'CALENDAR') {
        const start = this.parseDate(startDate);
        const end = this.parseDate(endDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return 0;
        }

        if (start > end) {
            return 0;
        }

        let days = 0;
        const current = new Date(start);

        while (current <= end) {
            const day = current.getUTCDay();
            const isWeekend = day === 0 || day === 6;
            if (policy === 'CALENDAR' || !isWeekend) {
                days += 1;
            }
            current.setUTCDate(current.getUTCDate() + 1);
        }

        return days;
    }
}
