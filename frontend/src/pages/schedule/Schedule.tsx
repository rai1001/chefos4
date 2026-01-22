import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import { scheduleService, Shift } from '@/services/schedule.service';
import { staffService } from '@/services/staff.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthScheduleCalendar } from '@/components/schedule/MonthScheduleCalendar';
import { WeekScheduleGrid } from '@/components/schedule/WeekScheduleGrid';
import { ShiftEditorDrawer } from '@/components/schedule/ShiftEditorDrawer';
import { useToast } from '@/components/ui/use-toast';

export default function SchedulePage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [scheduleMonthId, setScheduleMonthId] = useState<string | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorDate, setEditorDate] = useState<string>('');
    const [editingShift, setEditingShift] = useState<Shift | null>(null);

    const { data: staff = [] } = useQuery({
        queryKey: ['staff'],
        queryFn: () => staffService.list(),
    });

    const staffOptions = useMemo(
        () =>
            staff.map((item) => ({
                id: item.id,
                name: item.member?.user?.name || item.member?.user?.email || item.id,
            })),
        [staff]
    );

    const createMonthMutation = useMutation({
        mutationFn: (monthValue: string) => scheduleService.createMonth({ month: monthValue }),
        onSuccess: (data) => {
            setScheduleMonthId(data.id);
            queryClient.invalidateQueries({ queryKey: ['schedule-month', data.id] });
        },
    });

    const { data: scheduleMonth } = useQuery({
        queryKey: ['schedule-month', scheduleMonthId],
        queryFn: () => scheduleService.getMonth(scheduleMonthId || ''),
        enabled: Boolean(scheduleMonthId),
    });

    useEffect(() => {
        createMonthMutation.mutate(month);
    }, [month]);

    const publishMutation = useMutation({
        mutationFn: () => scheduleService.publishMonth(scheduleMonthId || ''),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-month', scheduleMonthId] });
            toast({ title: 'Mes publicado' });
        },
    });

    const saveShift = async (payload: {
        shift_id?: string;
        date: string;
        start_time: string;
        end_time: string;
        shift_code: string;
        station?: string | null;
    }) => {
        if (!scheduleMonthId) {
            throw new Error('No schedule month');
        }

        if (payload.shift_id) {
            const updated = await scheduleService.updateShift(payload.shift_id, {
                date: payload.date,
                start_time: payload.start_time,
                end_time: payload.end_time,
                shift_code: payload.shift_code,
                station: payload.station,
            });
            queryClient.invalidateQueries({ queryKey: ['schedule-month', scheduleMonthId] });
            return updated;
        }

        const created = await scheduleService.createShift({
            schedule_month_id: scheduleMonthId,
            date: payload.date,
            start_time: payload.start_time,
            end_time: payload.end_time,
            shift_code: payload.shift_code,
            station: payload.station,
        });
        queryClient.invalidateQueries({ queryKey: ['schedule-month', scheduleMonthId] });
        return created;
    };

    const saveAssignments = async (shiftId: string, staffIds: string[]) => {
        await scheduleService.updateAssignments(shiftId, staffIds);
        queryClient.invalidateQueries({ queryKey: ['schedule-month', scheduleMonthId] });
    };

    const openForDay = (date: string) => {
        setEditorDate(date);
        setEditingShift(null);
        setEditorOpen(true);
    };

    const openForShift = (shift: Shift) => {
        setEditorDate(shift.date);
        setEditingShift(shift);
        setEditorOpen(true);
    };

    const shifts = scheduleMonth?.shifts || [];
    const timeOff = scheduleMonth?.time_off || [];
    const weekStart = startOfWeek(new Date(`${month}-01`), { weekStartsOn: 1 });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Horario</h1>
                    <p className="text-muted-foreground">Planifica el mes y gestiona turnos.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="rounded-md border px-3 py-2 text-sm"
                    />
                    <Button
                        variant="outline"
                        onClick={() => publishMutation.mutate()}
                        disabled={!scheduleMonthId || publishMutation.isPending}
                    >
                        Publicar mes
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Vista</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="month">
                        <TabsList>
                            <TabsTrigger value="month">Mensual</TabsTrigger>
                            <TabsTrigger value="week">Semanal</TabsTrigger>
                        </TabsList>
                        <TabsContent value="month" className="pt-4">
                            <MonthScheduleCalendar
                                month={new Date(`${month}-01`)}
                                shifts={shifts}
                                timeOff={timeOff}
                                onSelectDay={openForDay}
                                onSelectShift={openForShift}
                            />
                        </TabsContent>
                        <TabsContent value="week" className="pt-4">
                            <WeekScheduleGrid weekStart={weekStart} shifts={shifts} onSelectShift={openForShift} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <ShiftEditorDrawer
                open={editorOpen}
                onOpenChange={setEditorOpen}
                staff={staffOptions}
                date={editorDate}
                shift={editingShift}
                onSaveShift={saveShift}
                onSaveAssignments={saveAssignments}
            />
        </div>
    );
}
