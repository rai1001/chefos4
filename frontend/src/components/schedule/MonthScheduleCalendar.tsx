import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { Shift } from '@/services/schedule.service';

interface TimeOffRecord {
    type: string;
    start_date: string;
    end_date: string;
}

interface MonthScheduleCalendarProps {
    month: Date;
    shifts: Shift[];
    timeOff: TimeOffRecord[];
    onSelectDay: (date: string) => void;
    onSelectShift: (shift: Shift) => void;
}

export function MonthScheduleCalendar({
    month,
    shifts,
    timeOff,
    onSelectDay,
    onSelectShift,
}: MonthScheduleCalendarProps) {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const shiftsByDate = shifts.reduce<Record<string, Shift[]>>((acc, shift) => {
        acc[shift.date] = acc[shift.date] || [];
        acc[shift.date].push(shift);
        return acc;
    }, {});

    const hasTimeOff = (date: string, type?: string) =>
        timeOff.filter((entry) => {
            if (type && entry.type !== type) return false;
            return entry.start_date <= date && entry.end_date >= date;
        }).length;

    return (
        <div className="grid grid-cols-7 gap-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label) => (
                <div key={label} className="text-center text-xs font-semibold text-muted-foreground">
                    {label}
                </div>
            ))}
            {days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayShifts = shiftsByDate[dateKey] || [];
                const vacCount = hasTimeOff(dateKey, 'VACATION');
                const sickCount = hasTimeOff(dateKey, 'SICK_LEAVE');

                return (
                    <div
                        key={dateKey}
                        className={cn(
                            'rounded-lg border p-2 text-xs min-h-[90px] cursor-pointer hover:border-primary',
                            !isSameMonth(day, month) && 'bg-muted/30 text-muted-foreground'
                        )}
                        onClick={() => onSelectDay(dateKey)}
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">{format(day, 'd')}</span>
                            <div className="flex gap-1 text-[10px] text-muted-foreground">
                                {vacCount > 0 && <span>VAC {vacCount}</span>}
                                {sickCount > 0 && <span>BAJA {sickCount}</span>}
                            </div>
                        </div>
                        <div className="mt-2 space-y-1">
                            {dayShifts.map((shift) => (
                                <button
                                    key={shift.id}
                                    type="button"
                                    className="w-full rounded bg-primary/10 px-2 py-1 text-left text-[10px] text-primary hover:bg-primary/20"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onSelectShift(shift);
                                    }}
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
