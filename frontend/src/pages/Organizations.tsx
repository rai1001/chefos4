
import { useState, useEffect } from 'react';
import { Hotel, Plus, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/authStore';

export default function OrganizationsManagement() {
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const { toast } = useToast();
    const { user } = useAuthStore();

    const fetchOrganizations = async () => {
        try {
            const res = await api.get('/organizations');
            setOrganizations(res.data.data);
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudieron cargar los hoteles', variant: 'destructive' });
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const handleCreate = async () => {
        try {
            await api.post('/organizations', { name: newOrgName });
            toast({ title: 'Hotel creado', description: `Se ha registrado el hotel ${newOrgName}` });
            setIsCreateOpen(false);
            setNewOrgName('');
            fetchOrganizations();
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo crear el hotel', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold italic tracking-tight">Mis Hoteles</h1>
                    <p className="text-muted-foreground">Gestiona múltiples sedes y organizaciones</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Hotel
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Nuevo Hotel</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre del Hotel / Sede</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Culinary Grand Hotel"
                                    value={newOrgName}
                                    onChange={(e) => setNewOrgName(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreate}>Crear</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map((org, i) => (
                    <Card key={i} className="group hover:border-primary transition-all duration-300 overflow-hidden">
                        <CardHeader className="bg-muted/30 group-hover:bg-primary/5 transition-colors">
                            <div className="flex justify-between items-start">
                                <Hotel className="h-8 w-8 text-primary/60 group-hover:text-primary transition-colors" />
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                    {org.id.split('-')[0]}
                                </Badge>
                            </div>
                            <CardTitle className="mt-4">{org.name}</CardTitle>
                            <CardDescription>Plan: {org.plan}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ShieldCheck className="h-4 w-4 text-green-500" />
                                {org.is_active ? 'Activo' : 'Inactivo'}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/10 group-hover:bg-transparent">
                            <Button variant="ghost" className="w-full text-primary hover:text-primary hover:bg-primary/10">
                                Acceder <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
