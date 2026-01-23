import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { scheduleService, Shift } from '@/services/schedule.service';
import { staffService } from '@/services/staff.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuincenaScheduleGrid } from '@/components/schedule/QuincenaScheduleGrid';
import { useToast } from '@/components/ui/use-toast';

export default function SchedulePage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [scheduleMonthId, setScheduleMonthId] = useState<string | null>(null);
    const [validation, setValidation] = useState<{ errors: any[]; warnings: any[] } | null>(null);

    const { data: staff = [] } = useQuery({
        queryKey: ['staff'],
        queryFn: () => staffService.list(),
    });

    const staffOptions = useMemo(
        () =>
            staff.map((item) => ({
                id: item.id,
                name: item.display_name || item.member?.user?.name || item.member?.user?.email || item.id,
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
        mutationFn: async () => {
            if (!scheduleMonthId) {
                return null;
            }
            const result = await scheduleService.validateMonth(scheduleMonthId);
            setValidation(result);
            if (result.errors.length > 0) {
                throw new Error('validation_failed');
            }
            return scheduleService.publishMonth(scheduleMonthId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-month', scheduleMonthId] });
            toast({ title: 'Mes publicado' });
        },
        onError: (error: any) => {
            if (error?.message === 'validation_failed') {
                toast({ title: 'No se puede publicar', description: 'Hay errores de reglas', variant: 'destructive' });
            }
        },
    });

    const validateMutation = useMutation({
        mutationFn: () => scheduleService.validateMonth(scheduleMonthId || ''),
        onSuccess: (result) => {
            setValidation(result);
        },
    });

    const generateMutation = useMutation({
        mutationFn: () => scheduleService.generateMonth(scheduleMonthId || ''),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['schedule-month', scheduleMonthId] });
            toast({
                title: 'Horario generado',
                description: `Turnos: ${result.created_shifts}, asignaciones: ${result.created_assignments}`,
            });
            if (result.warnings?.length) {
                toast({
                    title: 'Avisos de generación',
                    description: result.warnings.slice(0, 3).join(' · '),
                });
            }
        },
    });

    const shifts = scheduleMonth?.shifts || [];
    const timeOff = scheduleMonth?.time_off || [];
    const monthDate = new Date(`${month}-01`);
    const firstHalfStart = startOfMonth(monthDate);
    const firstHalfEnd = new Date(format(firstHalfStart, 'yyyy-MM-15'));
    const secondHalfStart = addDays(firstHalfEnd, 1);
    const secondHalfEnd = endOfMonth(monthDate);

    const setStaffShift = async (date: string, staffId: string, shiftCode: string) => {
        if (!scheduleMonthId) {
            toast({ title: 'No hay mes activo', variant: 'destructive' });
            return;
        }

        const dateShifts = shifts.filter((shift) => shift.date === date);
        const updates: Array<Promise<any>> = [];

        const applyAssignments = (shift: Shift, staffIds: string[]) => {
            updates.push(scheduleService.updateAssignments(shift.id, staffIds));
        };

        dateShifts.forEach((shift) => {
            const currentIds = (shift.assignments || []).map((item) => item.staff_id);
            if (currentIds.includes(staffId)) {
                applyAssignments(shift, currentIds.filter((id) => id !== staffId));
            }
        });

        if (shiftCode) {
            const targetShift = dateShifts.find((shift) => shift.shift_code === shiftCode);
            const defaultTimes =
                shiftCode === 'MORNING'
                    ? { start: '06:00', end: '14:00' }
                    : { start: '16:00', end: '00:00' };

            if (targetShift) {
                const currentIds = (targetShift.assignments || []).map((item) => item.staff_id);
                if (!currentIds.includes(staffId)) {
                    applyAssignments(targetShift, [...currentIds, staffId]);
                }
            } else {
                const created = await scheduleService.createShift({
                    schedule_month_id: scheduleMonthId,
                    date,
                    start_time: defaultTimes.start,
                    end_time: defaultTimes.end,
                    shift_code: shiftCode,
                });
                applyAssignments(created, [staffId]);
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates);
            queryClient.invalidateQueries({ queryKey: ['schedule-month', scheduleMonthId] });
        }
    };

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
                        className="rounded-md border border-white/10 bg-muted/20 px-3 py-2 text-sm text-foreground"
                    />
                    <Button
                        variant="outline"
                        onClick={() => validateMutation.mutate()}
                        disabled={!scheduleMonthId || validateMutation.isPending}
                    >
                        Validar reglas
                    </Button>
                    <Button
                        onClick={() => generateMutation.mutate()}
                        disabled={!scheduleMonthId || generateMutation.isPending}
                    >
                        Generar mes
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => publishMutation.mutate()}
                        disabled={!scheduleMonthId || publishMutation.isPending}
                    >
                        Publicar mes
                    </Button>
                </div>
            </div>

            {validation && (
                <Card>
                    <CardHeader>
                        <CardTitle>Conflictos y avisos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div>
                            <div className="font-semibold">Errores</div>
                            {validation.errors.length === 0 && (
                                <div className="text-muted-foreground">Sin errores.</div>
                            )}
                            {validation.errors.map((item, index) => (
                                <div key={`error-${index}`} className="text-destructive">
                                    {item.message}
                                </div>
                            ))}
                        </div>
                        <div>
                            <div className="font-semibold">Avisos</div>
                            {validation.warnings.length === 0 && (
                                <div className="text-muted-foreground">Sin avisos.</div>
                            )}
                            {validation.warnings.map((item, index) => (
                                <div key={`warning-${index}`} className="text-muted-foreground">
                                    {item.message}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Vista</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="first">
                        <TabsList>
                            <TabsTrigger value="first">1-15</TabsTrigger>
                            <TabsTrigger value="second">16-fin</TabsTrigger>
                        </TabsList>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded border border-amber-400/40 bg-amber-500/20 px-2 py-1 text-amber-100">
                                M (06:00-14:00)
                            </span>
                            <span className="rounded border border-indigo-400/40 bg-indigo-500/20 px-2 py-1 text-indigo-100">
                                T (16:00-00:00)
                            </span>
                            <span className="rounded border border-emerald-400/40 bg-emerald-500/20 px-2 py-1 text-emerald-100">
                                VAC
                            </span>
                            <span className="rounded border border-rose-400/40 bg-rose-500/20 px-2 py-1 text-rose-100">
                                BAJA
                            </span>
                            <span className="rounded border border-slate-400/40 bg-slate-500/20 px-2 py-1 text-slate-100">
                                OFF
                            </span>
                        </div>
                        <TabsContent value="first" className="pt-4">
                            <QuincenaScheduleGrid
                                start={firstHalfStart}
                                end={firstHalfEnd}
                                staff={staffOptions}
                                shifts={shifts}
                                timeOff={timeOff}
                                onSetShift={setStaffShift}
                            />
                        </TabsContent>
                        <TabsContent value="second" className="pt-4">
                            <QuincenaScheduleGrid
                                start={secondHalfStart}
                                end={secondHalfEnd}
                                staff={staffOptions}
                                shifts={shifts}
                                timeOff={timeOff}
                                onSetShift={setStaffShift}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
