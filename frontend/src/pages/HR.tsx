
import { useState, useEffect } from 'react';
import { UserPlus, Calendar, Mail, Shield, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

export default function HRManagement() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteData, setInviteData] = useState({ email: '', role: 'COOK' });
    const { toast } = useToast();

    const fetchEmployees = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/hr/employees');
            setEmployees(res.data.data);
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudieron cargar los empleados', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleInvite = async () => {
        try {
            await api.post('/hr/invite', inviteData);
            toast({ title: 'Invitación enviada', description: `Se ha enviado una invitación a ${inviteData.email}` });
            setIsInviteOpen(false);
            setInviteData({ email: '', role: 'COOK' });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'Falló el envío de la invitación',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold italic tracking-tight">Gestión de Personal</h1>
                    <p className="text-muted-foreground">Administra tu equipo, roles e invitaciones</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Calendar className="mr-2 h-4 w-4" /> Horarios</Button>
                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300">
                                <UserPlus className="mr-2 h-4 w-4" /> Invitar Usuario
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invitar al Equipo</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input
                                        id="email"
                                        placeholder="chef@culinaryos.com"
                                        value={inviteData.email}
                                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Rol</Label>
                                    <Select
                                        value={inviteData.role}
                                        onValueChange={(v) => setInviteData({ ...inviteData, role: v })}
                                    >
                                        <SelectTrigger>
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
                                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
                                <Button onClick={handleInvite}>Enviar Invitación</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-none shadow-md bg-gradient-to-br from-background to-muted/20">
                <CardHeader>
                    <CardTitle>Equipo Actual</CardTitle>
                    <CardDescription>Lista de miembros activos en la organización</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Nombre</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.map((emp, i) => (
                                <TableRow key={i} className="group transition-colors">
                                    <TableCell className="font-medium">{emp.user.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{emp.user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-semibold uppercase tracking-wider text-[10px]">
                                            <Shield className="mr-1 h-3 w-3" /> {emp.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="group-hover:opacity-100 opacity-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {employees.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                                        No hay empleados registrados aún.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
