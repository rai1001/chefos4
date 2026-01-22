import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffService } from '@/services/staff.service';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

interface EmployeeOption {
    role: string;
    user: { id: string; name: string; email: string };
    id?: string;
}

export default function StaffPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [memberId, setMemberId] = useState('');
    const [roleInKitchen, setRoleInKitchen] = useState('');
    const [skills, setSkills] = useState('');
    const [weeklyHours, setWeeklyHours] = useState('');
    const [maxHours, setMaxHours] = useState('');
    const [vacationDays, setVacationDays] = useState('');

    const { data: staff = [] } = useQuery({
        queryKey: ['staff'],
        queryFn: () => staffService.list(),
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['hr-employees'],
        queryFn: async () => {
            const response = await api.get('/hr/employees');
            return response.data.data as EmployeeOption[];
        },
    });

    const staffMemberIds = useMemo(() => new Set(staff.map((item) => item.member?.id)), [staff]);
    const availableEmployees = employees.filter((employee) => employee.id && !staffMemberIds.has(employee.id));

    const createMutation = useMutation({
        mutationFn: () =>
            staffService.create({
                member_id: memberId,
                role_in_kitchen: roleInKitchen || null,
                skills: skills ? skills.split(',').map((value) => value.trim()).filter(Boolean) : [],
                contract: {
                    weekly_hours_target: weeklyHours ? Number(weeklyHours) : null,
                    max_weekly_hours: maxHours ? Number(maxHours) : null,
                    vacation_days_per_year: vacationDays ? Number(vacationDays) : null,
                },
            }),
        onSuccess: () => {
            setMemberId('');
            setRoleInKitchen('');
            setSkills('');
            setWeeklyHours('');
            setMaxHours('');
            setVacationDays('');
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            toast({ title: 'Staff creado' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo crear el perfil', variant: 'destructive' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) => staffService.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            toast({ title: 'Staff actualizado' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo actualizar el perfil', variant: 'destructive' });
        },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Equipo</h1>
                <p className="text-muted-foreground">Gestiona perfiles, contratos y habilidades.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Nuevo perfil</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select value={memberId} onValueChange={setMemberId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar empleado" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableEmployees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id || ''}>
                                    {employee.user?.name || employee.user?.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Rol en cocina"
                        value={roleInKitchen}
                        onChange={(e) => setRoleInKitchen(e.target.value)}
                    />
                    <Input
                        placeholder="Skills (coma separada)"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                    />
                    <Input
                        placeholder="Horas/semana"
                        type="number"
                        value={weeklyHours}
                        onChange={(e) => setWeeklyHours(e.target.value)}
                    />
                    <Input
                        placeholder="Max horas/semana"
                        type="number"
                        value={maxHours}
                        onChange={(e) => setMaxHours(e.target.value)}
                    />
                    <Input
                        placeholder="Vacaciones/año"
                        type="number"
                        value={vacationDays}
                        onChange={(e) => setVacationDays(e.target.value)}
                    />
                    <div className="md:col-span-3 flex justify-end">
                        <Button
                            onClick={() => createMutation.mutate()}
                            disabled={!memberId || createMutation.isPending}
                        >
                            Crear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {staff.map((item) => (
                    <Card key={item.id}>
                        <CardHeader>
                            <CardTitle>
                                {item.member?.user?.name || item.member?.user?.email || 'Staff'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Input
                                defaultValue={item.role_in_kitchen || ''}
                                placeholder="Rol en cocina"
                                onBlur={(e) =>
                                    updateMutation.mutate({
                                        id: item.id,
                                        payload: { role_in_kitchen: e.target.value || null },
                                    })
                                }
                            />
                            <Input
                                defaultValue={(item.skills || []).join(', ')}
                                placeholder="Skills"
                                onBlur={(e) =>
                                    updateMutation.mutate({
                                        id: item.id,
                                        payload: {
                                            skills: e.target.value
                                                .split(',')
                                                .map((value) => value.trim())
                                                .filter(Boolean),
                                        },
                                    })
                                }
                            />
                            <Select
                                value={item.active ? 'active' : 'inactive'}
                                onValueChange={(value) =>
                                    updateMutation.mutate({
                                        id: item.id,
                                        payload: { active: value === 'active' },
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="inactive">Inactivo</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                defaultValue={item.contract?.weekly_hours_target ?? ''}
                                placeholder="Horas/semana"
                                type="number"
                                onBlur={(e) =>
                                    updateMutation.mutate({
                                        id: item.id,
                                        payload: {
                                            contract: {
                                                weekly_hours_target: e.target.value ? Number(e.target.value) : null,
                                            },
                                        },
                                    })
                                }
                            />
                            <Input
                                defaultValue={item.contract?.max_weekly_hours ?? ''}
                                placeholder="Max horas/semana"
                                type="number"
                                onBlur={(e) =>
                                    updateMutation.mutate({
                                        id: item.id,
                                        payload: {
                                            contract: {
                                                max_weekly_hours: e.target.value ? Number(e.target.value) : null,
                                            },
                                        },
                                    })
                                }
                            />
                            <Input
                                defaultValue={item.contract?.vacation_days_per_year ?? ''}
                                placeholder="Vacaciones/año"
                                type="number"
                                onBlur={(e) =>
                                    updateMutation.mutate({
                                        id: item.id,
                                        payload: {
                                            contract: {
                                                vacation_days_per_year: e.target.value ? Number(e.target.value) : null,
                                            },
                                        },
                                    })
                                }
                            />
                            <div className="md:col-span-3 text-xs text-muted-foreground">
                                Saldo {new Date().getFullYear()}:&nbsp;
                                {item.vacation_balance?.[0]?.days_remaining ?? 0} días disponibles
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {staff.length === 0 && (
                    <div className="text-sm text-muted-foreground">No hay perfiles creados.</div>
                )}
            </div>
        </div>
    );
}
