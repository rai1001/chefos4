import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shift } from '@/services/schedule.service';

interface StaffOption {
    id: string;
    name: string;
}

interface ShiftEditorDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staff: StaffOption[];
    date: string;
    shift?: Shift | null;
    onSaveShift: (payload: {
        shift_id?: string;
        date: string;
        start_time: string;
        end_time: string;
        shift_code: string;
        station?: string | null;
    }) => Promise<Shift>;
    onSaveAssignments: (shiftId: string, staffIds: string[]) => Promise<void>;
}

export function ShiftEditorDrawer({
    open,
    onOpenChange,
    staff,
    date,
    shift,
    onSaveShift,
    onSaveAssignments,
}: ShiftEditorDrawerProps) {
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('16:00');
    const [shiftCode, setShiftCode] = useState('MORNING');
    const [station, setStation] = useState('');
    const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const staffMap = useMemo(() => new Map(staff.map((item) => [item.id, item.name])), [staff]);

    useEffect(() => {
        if (shift) {
            setStartTime(shift.start_time);
            setEndTime(shift.end_time);
            setShiftCode(shift.shift_code);
            setStation(shift.station || '');
            setSelectedStaff(shift.assignments?.map((assignment) => assignment.staff_id) || []);
        } else {
            setStartTime('08:00');
            setEndTime('16:00');
            setShiftCode('MORNING');
            setStation('');
            setSelectedStaff([]);
        }
    }, [shift, open]);

    const toggleStaff = (staffId: string) => {
        setSelectedStaff((prev) =>
            prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const saved = await onSaveShift({
                shift_id: shift?.id,
                date,
                start_time: startTime,
                end_time: endTime,
                shift_code: shiftCode,
                station: station || null,
            });

            await onSaveAssignments(saved.id, selectedStaff);
            onOpenChange(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Editar turno</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Fecha</div>
                        <Input type="date" value={date} readOnly />
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Turno</div>
                        <Select value={shiftCode} onValueChange={setShiftCode}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MORNING">Mañana</SelectItem>
                                <SelectItem value="AFTERNOON">Tarde</SelectItem>
                                <SelectItem value="NIGHT">Noche</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Hora inicio</div>
                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Hora fin</div>
                        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-xs text-muted-foreground mb-1">Estación</div>
                        <Input value={station} onChange={(e) => setStation(e.target.value)} />
                    </div>
                </div>

                <div>
                    <div className="text-xs text-muted-foreground mb-2">Asignaciones</div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {staff.map((person) => (
                            <label key={person.id} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={selectedStaff.includes(person.id)}
                                    onChange={() => toggleStaff(person.id)}
                                />
                                <span>{staffMap.get(person.id)}</span>
                            </label>
                        ))}
                        {staff.length === 0 && (
                            <div className="text-xs text-muted-foreground">No hay staff disponible.</div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={saving}>
                        Guardar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
