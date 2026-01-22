import { addDays, format } from 'date-fns';
import { Shift } from '@/services/schedule.service';

interface WeekScheduleGridProps {
    weekStart: Date;
    shifts: Shift[];
    onSelectShift: (shift: Shift) => void;
}

export function WeekScheduleGrid({ weekStart, shifts, onSelectShift }: WeekScheduleGridProps) {
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const shiftsByDate = shifts.reduce<Record<string, Shift[]>>((acc, shift) => {
        acc[shift.date] = acc[shift.date] || [];
        acc[shift.date].push(shift);
        return acc;
    }, {});

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
            {days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayShifts = shiftsByDate[dateKey] || [];

                return (
                    <div key={dateKey} className="rounded-lg border p-3">
                        <div className="text-sm font-semibold">{format(day, 'EEE d')}</div>
                        <div className="mt-3 space-y-2">
                            {dayShifts.length === 0 && (
                                <div className="text-xs text-muted-foreground">Sin turnos</div>
                            )}
                            {dayShifts.map((shift) => (
                                <button
                                    key={shift.id}
                                    type="button"
                                    className="w-full rounded bg-primary/10 px-2 py-1 text-left text-xs text-primary hover:bg-primary/20"
                                    onClick={() => onSelectShift(shift)}
                                >
                                    {shift.shift_code} {shift.start_time}-{shift.end_time}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
