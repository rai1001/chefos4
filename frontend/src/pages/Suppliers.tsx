import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Mail, Phone } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SupplierForm } from '@/components/suppliers/SupplierForm';
import { SupplierCountdown } from '@/components/suppliers/SupplierCountdown';
import { suppliersService, Supplier } from '@/services/suppliers.service';
import { useToast } from '@/components/ui/use-toast';
import { useProductFamilies } from '@/hooks/useProductFamilies';

export default function Suppliers() {
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
    const debouncedSearch = useDebounce(search, 300);
    const { data: suppliers, isLoading, refetch } = useSuppliers(debouncedSearch);
    const { data: families } = useProductFamilies();
    const { toast } = useToast();

    const familyNameById = new Map((families || []).map((family) => [family.id, family.name]));

    const handleEdit = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
        try {
            await suppliersService.delete(id);
            toast({ title: 'Proveedor eliminado' });
            refetch();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'No se pudo eliminar',
                variant: 'destructive'
            });
        }
    };

    const handleSuccess = () => {
        setIsFormOpen(false);
        setSelectedSupplier(undefined);
        refetch();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Proveedores</h1>
                    <p className="text-muted-foreground">Gestión de suministros y tiempos de entrega</p>
                </div>
                <Dialog open={isFormOpen} onOpenChange={(open) => {
                    setIsFormOpen(open);
                    if (!open) setSelectedSupplier(undefined);
                }}>
                    <DialogTrigger asChild>
                        <Button className="btn-large"><Plus className="mr-2 h-5 w-5" />Nuevo Proveedor</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{selectedSupplier ? 'Editar' : 'Crear'} Proveedor</DialogTitle>
                        </DialogHeader>
                        <SupplierForm initialData={selectedSupplier} onSuccess={handleSuccess} />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar proveedor..."
                                className="pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">Nombre</th>
                                    <th className="px-4 py-3 text-left font-medium">Email</th>
                                    <th className="px-4 py-3 text-left font-medium">Telefono</th>
                                    <th className="px-4 py-3 text-left font-medium">Familia por defecto</th>
                                    <th className="px-4 py-3 text-left font-medium">Lead Time</th>
                                    <th className="px-4 py-3 text-left font-medium">Próximo Cierre</th>
                                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Cargando...</td></tr>
                                ) : suppliers?.data.length === 0 ? (
                                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No se encontraron proveedores</td></tr>
                                ) : (
                                    suppliers?.data.map((supplier) => (
                                        <tr key={supplier.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-medium">{supplier.name}</td>
                                            <td className="px-4 py-3">
                                                {supplier.contact_email ? (
                                                    <div className="flex items-center text-xs gap-1">
                                                        <Mail className="w-3 h-3" /> {supplier.contact_email}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {supplier.contact_phone ? (
                                                    <div className="flex items-center text-xs gap-1">
                                                        <Phone className="w-3 h-3" /> {supplier.contact_phone}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {supplier.default_family_id ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        {familyNameById.get(supplier.default_family_id) || 'Sin nombre'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{supplier.lead_time_days} días</td>
                                            <td className="px-4 py-3">
                                                <SupplierCountdown
                                                    cutOffTime={supplier.cut_off_time}
                                                    deliveryDays={supplier.delivery_days}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
