import { eachDayOfInterval, format, isWithinInterval, parseISO } from 'date-fns';
import { Shift } from '@/services/schedule.service';

interface StaffOption {
    id: string;
    name: string;
}

interface TimeOffEntry {
    staff_id: string;
    type: 'VACATION' | 'SICK_LEAVE' | 'OTHER';
    start_date: string;
    end_date: string;
}

interface QuincenaScheduleGridProps {
    start: Date;
    end: Date;
    staff: StaffOption[];
    shifts: Shift[];
    timeOff: TimeOffEntry[];
    onSetShift: (date: string, staffId: string, shiftCode: string) => void;
}

export function QuincenaScheduleGrid({
    start,
    end,
    staff,
    shifts,
    timeOff,
    onSetShift,
}: QuincenaScheduleGridProps) {
    const days = eachDayOfInterval({ start, end });
    const shiftByDateStaff = new Map<string, string>();
    const timeOffByDateStaff = new Map<string, TimeOffEntry['type']>();

    shifts.forEach((shift) => {
        (shift.assignments || []).forEach((assignment) => {
            shiftByDateStaff.set(`${shift.date}-${assignment.staff_id}`, shift.shift_code);
        });
    });

    timeOff.forEach((entry) => {
        const startDate = parseISO(entry.start_date);
        const endDate = parseISO(entry.end_date);
        days.forEach((day) => {
            if (
                isWithinInterval(day, {
                    start: startDate,
                    end: endDate,
                })
            ) {
                const dateKey = format(day, 'yyyy-MM-dd');
                timeOffByDateStaff.set(`${dateKey}-${entry.staff_id}`, entry.type);
            }
        });
    });

    const getCellStyle = (value: string, timeOffType?: TimeOffEntry['type']) => {
        if (timeOffType === 'VACATION') {
            return 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100';
        }
        if (timeOffType === 'SICK_LEAVE') {
            return 'border-rose-400/40 bg-rose-500/20 text-rose-100';
        }
        if (timeOffType === 'OTHER') {
            return 'border-slate-400/40 bg-slate-500/20 text-slate-100';
        }
        if (value === 'MORNING') {
            return 'border-amber-400/40 bg-amber-500/20 text-amber-100';
        }
        if (value === 'AFTERNOON') {
            return 'border-indigo-400/40 bg-indigo-500/20 text-indigo-100';
        }
        return 'border-white/10 bg-transparent text-foreground';
    };

    const getLabel = (value: string, timeOffType?: TimeOffEntry['type']) => {
        if (timeOffType === 'VACATION') return 'VAC';
        if (timeOffType === 'SICK_LEAVE') return 'BAJA';
        if (timeOffType === 'OTHER') return 'OFF';
        if (value === 'MORNING') return 'M';
        if (value === 'AFTERNOON') return 'T';
        return '-';
    };

    return (
        <div className="overflow-auto rounded-lg border">
            <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-background">
                    <tr>
                        <th className="p-2 text-left font-semibold">Empleado</th>
                        {days.map((day) => (
                            <th key={day.toISOString()} className="p-2 text-center font-semibold">
                                <div>{format(day, 'd')}</div>
                                <div className="text-[10px] text-muted-foreground">
                                    {format(day, 'EEE')}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {staff.map((person) => (
                        <tr key={person.id} className="border-t">
                            <td className="p-2 font-medium">{person.name}</td>
                            {days.map((day) => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const value = shiftByDateStaff.get(`${dateKey}-${person.id}`) || '';
                                const timeOffType = timeOffByDateStaff.get(`${dateKey}-${person.id}`);
                                const isBlocked = Boolean(timeOffType);
                                return (
                                    <td key={`${person.id}-${dateKey}`} className="p-1 text-center">
                                        <div
                                            className={`flex items-center justify-center rounded border px-1 py-1 ${getCellStyle(
                                                value,
                                                timeOffType
                                            )}`}
                                        >
                                            <select
                                                className="w-14 bg-transparent text-center text-xs text-current outline-none"
                                                value={isBlocked ? '' : value}
                                                onChange={(e) => onSetShift(dateKey, person.id, e.target.value)}
                                                disabled={isBlocked}
                                            >
                                                <option value="">{getLabel(value, timeOffType)}</option>
                                                {!isBlocked && (
                                                    <>
                                                        <option value="MORNING">M</option>
                                                        <option value="AFTERNOON">T</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
