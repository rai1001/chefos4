import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffService } from '@/services/staff.service';
import { timeOffService } from '@/services/time-off.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const types = [
    { value: 'VACATION', label: 'Vacaciones' },
    { value: 'SICK_LEAVE', label: 'Baja' },
    { value: 'OTHER', label: 'Otro' },
];

export default function TimeOffPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [staffId, setStaffId] = useState('');
    const [type, setType] = useState('VACATION');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');

    const { data: staff = [] } = useQuery({
        queryKey: ['staff'],
        queryFn: () => staffService.list(),
    });

    const { data: requests = [] } = useQuery({
        queryKey: ['time-off'],
        queryFn: () => timeOffService.list(),
    });

    const staffOptions = useMemo(
        () =>
            staff.map((item) => ({
                id: item.id,
                label: item.display_name || item.member?.user?.name || item.member?.user?.email || item.id,
            })),
        [staff]
    );

    const requestMutation = useMutation({
        mutationFn: () =>
            timeOffService.request({
                staff_id: staffId,
                type: type as any,
                start_date: startDate,
                end_date: endDate,
                notes: notes || undefined,
            }),
        onSuccess: () => {
            setStaffId('');
            setType('VACATION');
            setStartDate('');
            setEndDate('');
            setNotes('');
            queryClient.invalidateQueries({ queryKey: ['time-off'] });
            toast({ title: 'Solicitud enviada' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo enviar la solicitud', variant: 'destructive' });
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => timeOffService.approve(id, 'CALENDAR'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time-off'] });
            toast({ title: 'Solicitud aprobada' });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (id: string) => timeOffService.reject(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time-off'] });
            toast({ title: 'Solicitud rechazada' });
        },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Ausencias</h1>
                <p className="text-muted-foreground">Solicitudes y aprobaciones de vacaciones y bajas.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Nueva solicitud</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Select value={staffId} onValueChange={setStaffId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar staff" />
                        </SelectTrigger>
                        <SelectContent>
                            {staffOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            {types.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    <div className="md:col-span-4">
                        <Textarea
                            placeholder="Notas"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-4 flex justify-end">
                        <Button
                            onClick={() => requestMutation.mutate()}
                            disabled={!staffId || !startDate || !endDate}
                        >
                            Enviar solicitud
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {requests.map((request) => (
                    <Card key={request.id}>
                        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-6">
                            <div>
                                <div className="font-semibold">
                                    {request.staff?.display_name ||
                                        request.staff?.member?.user?.name ||
                                        request.staff?.member?.user?.email}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {request.type} • {request.start_date} → {request.end_date} • {request.status}
                                </div>
                                {request.notes && (
                                    <div className="text-xs text-muted-foreground">Notas: {request.notes}</div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => approveMutation.mutate(request.id)}
                                    disabled={request.status !== 'REQUESTED'}
                                >
                                    Aprobar
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => rejectMutation.mutate(request.id)}
                                    disabled={request.status !== 'REQUESTED'}
                                >
                                    Rechazar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {requests.length === 0 && (
                    <div className="text-sm text-muted-foreground">No hay solicitudes.</div>
                )}
            </div>
        </div>
    );
}
