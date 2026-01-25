import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffService } from '@/services/staff.service';
import { scheduleRulesService } from '@/services/schedule-rules.service';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
    const [displayName, setDisplayName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [staffType, setStaffType] = useState('INTERNAL');
    const [roleInKitchen, setRoleInKitchen] = useState('');
    const [skills, setSkills] = useState('');
    const [weeklyHours, setWeeklyHours] = useState('');
    const [maxHours, setMaxHours] = useState('');
    const [vacationDays, setVacationDays] = useState('');
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('COOK');

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
                member_id: memberId || null,
                display_name: displayName || null,
                contact_email: contactEmail || null,
                staff_type: staffType || null,
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
            setDisplayName('');
            setContactEmail('');
            setStaffType('INTERNAL');
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

    const inviteMutation = useMutation({
        mutationFn: () => api.post('/hr/invite', { email: inviteEmail, role: inviteRole }),
        onSuccess: () => {
            setInviteEmail('');
            setInviteRole('COOK');
            setIsInviteOpen(false);
            queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
            toast({ title: 'Invitacion enviada', description: `Se envio a ${inviteEmail}` });
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'No se pudo enviar la invitacion',
                variant: 'destructive',
            });
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Equipo</h1>
                    <p className="text-muted-foreground">Gestiona perfiles, contratos y habilidades.</p>
                </div>
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">Invitar empleado</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invitar al equipo</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="invite-email">Correo</Label>
                                <Input
                                    id="invite-email"
                                    placeholder="empleado@empresa.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-role">Rol</Label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                    <SelectTrigger id="invite-role">
                                        <SelectValue placeholder="Selecciona un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="COOK">Cocinero</SelectItem>
                                        <SelectItem value="SERVER">Sala / Camarero</SelectItem>
                                        <SelectItem value="AREA_MANAGER">Responsable</SelectItem>
                                        <SelectItem value="ORG_ADMIN">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => inviteMutation.mutate()}
                                disabled={!inviteEmail || inviteMutation.isPending}
                            >
                                Enviar invitacion
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                            {availableEmployees
                                .filter((employee) => employee.id)
                                .map((employee) => (
                                    <SelectItem key={employee.id} value={employee.id as string}>
                                        {employee.user?.name || employee.user?.email}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    {availableEmployees.length === 0 && (
                        <div className="md:col-span-3 text-xs text-muted-foreground">
                            No hay empleados disponibles. Envia una invitacion y espera a que acepten para crear el perfil.
                        </div>
                    )}
                    <Input
                        placeholder="Nombre (si no hay usuario)"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <Select value={staffType} onValueChange={setStaffType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="INTERNAL">Interno</SelectItem>
                            <SelectItem value="PRACTICAS">Practicas</SelectItem>
                            <SelectItem value="EXTRA">Extra</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Email contacto (opcional)"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                    />
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
                            disabled={(!memberId && !displayName) || createMutation.isPending}
                        >
                            Crear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {staff.map((item) => (
                    <StaffCard
                        key={item.id}
                        staff={item}
                        onUpdate={updateMutation as any}
                    />
                ))}
                {staff.length === 0 && (
                    <div className="text-sm text-muted-foreground">No hay perfiles creados.</div>
                )}
            </div>
        </div>
    );
}

function StaffCard({
    staff,
    onUpdate,
}: {
    staff: any;
    onUpdate: ReturnType<typeof useMutation>;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [allowedShiftCodes, setAllowedShiftCodes] = useState<string[]>([]);
    const [rotationMode, setRotationMode] = useState('NONE');
    const [requiresWeekendOff, setRequiresWeekendOff] = useState(true);
    const [maxConsecutiveDays, setMaxConsecutiveDays] = useState('');

    const { data: rules } = useQuery({
        queryKey: ['staff-rules', staff.id],
        queryFn: () => scheduleRulesService.getStaffRules(staff.id),
    });

    useEffect(() => {
        if (rules) {
            setAllowedShiftCodes(rules.allowed_shift_codes || []);
            setRotationMode(rules.rotation_mode || 'NONE');
            setRequiresWeekendOff(rules.requires_weekend_off_per_month ?? true);
            setMaxConsecutiveDays(
                rules.max_consecutive_days !== null && rules.max_consecutive_days !== undefined
                    ? String(rules.max_consecutive_days)
                    : ''
            );
        }
    }, [rules]);

    const rulesMutation = useMutation({
        mutationFn: () =>
            scheduleRulesService.updateStaffRules(staff.id, {
                allowed_shift_codes: allowedShiftCodes,
                rotation_mode: rotationMode,
                requires_weekend_off_per_month: requiresWeekendOff,
                max_consecutive_days: maxConsecutiveDays ? Number(maxConsecutiveDays) : null,
            } as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-rules', staff.id] });
            toast({ title: 'Reglas actualizadas' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudieron guardar reglas', variant: 'destructive' });
        },
    });

    const toggleShift = (code: string) => {
        setAllowedShiftCodes((prev) =>
            prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {staff.display_name || staff.member?.user?.name || staff.member?.user?.email || 'Staff'}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                    defaultValue={staff.role_in_kitchen || ''}
                    placeholder="Rol en cocina"
                    onBlur={(e) =>
                        onUpdate.mutate({
                            id: staff.id,
                            payload: { role_in_kitchen: e.target.value || null },
                        })
                    }
                />
                <Input
                    defaultValue={(staff.skills || []).join(', ')}
                    placeholder="Skills"
                    onBlur={(e) =>
                        onUpdate.mutate({
                            id: staff.id,
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
                    value={staff.active ? 'active' : 'inactive'}
                    onValueChange={(value) =>
                        onUpdate.mutate({
                            id: staff.id,
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
                    defaultValue={staff.contract?.weekly_hours_target ?? ''}
                    placeholder="Horas/semana"
                    type="number"
                    onBlur={(e) =>
                        onUpdate.mutate({
                            id: staff.id,
                            payload: {
                                contract: {
                                    weekly_hours_target: e.target.value ? Number(e.target.value) : null,
                                },
                            },
                        })
                    }
                />
                <Input
                    defaultValue={staff.contract?.max_weekly_hours ?? ''}
                    placeholder="Max horas/semana"
                    type="number"
                    onBlur={(e) =>
                        onUpdate.mutate({
                            id: staff.id,
                            payload: {
                                contract: {
                                    max_weekly_hours: e.target.value ? Number(e.target.value) : null,
                                },
                            },
                        })
                    }
                />
                <Input
                    defaultValue={staff.contract?.vacation_days_per_year ?? ''}
                    placeholder="Vacaciones/año"
                    type="number"
                    onBlur={(e) =>
                        onUpdate.mutate({
                            id: staff.id,
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
                    {staff.vacation_balance?.[0]?.days_remaining ?? 0} días disponibles
                </div>

                <div className="md:col-span-3 rounded-md border p-4 space-y-3">
                    <div className="text-sm font-semibold">Reglas de horario</div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 text-sm">
                        {['MORNING', 'AFTERNOON', 'NIGHT'].map((code) => (
                            <label key={code} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={allowedShiftCodes.includes(code)}
                                    onChange={() => toggleShift(code)}
                                />
                                <span>{code}</span>
                            </label>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Select value={rotationMode} onValueChange={setRotationMode}>
                            <SelectTrigger>
                                <SelectValue placeholder="Rotacion" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">Sin rotacion</SelectItem>
                                <SelectItem value="WEEKLY">Semanal</SelectItem>
                                <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                                <SelectItem value="MONTHLY">Mensual</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Max dias consecutivos"
                            type="number"
                            value={maxConsecutiveDays}
                            onChange={(e) => setMaxConsecutiveDays(e.target.value)}
                        />
                        <Select
                            value={requiresWeekendOff ? 'yes' : 'no'}
                            onValueChange={(value) => setRequiresWeekendOff(value === 'yes')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Finde libre" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="yes">Finde libre requerido</SelectItem>
                                <SelectItem value="no">No requerido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            onClick={() => rulesMutation.mutate()}
                            disabled={rulesMutation.isPending}
                        >
                            Guardar reglas
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
