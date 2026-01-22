import { useState } from 'react';
import { Plus, Search, AlertTriangle, Upload } from 'lucide-react';
import { useIngredients, useLowStockIngredients } from '@/hooks/useIngredients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IngredientsList } from '@/components/ingredients/IngredientsList';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { CSVImportWizard } from '@/components/ingredients/CSVImportWizard';
import { Download } from 'lucide-react';
import { api } from '@/services/api';
import { Ingredient } from '@/services/ingredients.service';


export default function Ingredients() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);


    const { data, isLoading } = useIngredients({ page, limit: 20, search });
    const { data: lowStock } = useLowStockIngredients();


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Ingredientes</h1>
                    <p className="text-muted-foreground">
                        Gestiona tu catálogo de productos
                    </p>
                </div>


                <div className="flex gap-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="btn-large">
                                <Upload className="mr-2 h-5 w-5" />
                        Importar CSV/Excel
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Importar Ingredientes</DialogTitle>
                            </DialogHeader>
                            <CSVImportWizard onComplete={() => { }} />
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
                        className="btn-large"
                        onClick={async () => {
                            try {
                                const response = await api.get('/reports/inventory', { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', 'inventario.xlsx');
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                            } catch (error) {
                                console.error('Error al exportar inventario:', error);
                            }
                        }}
                    >
                        <Download className="mr-2 h-5 w-5" />
                        Exportar Excel
                    </Button>


                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="btn-large">
                                <Plus className="mr-2 h-5 w-5" />
                                Nuevo Ingrediente
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Crear Ingrediente</DialogTitle>
                            </DialogHeader>
                            <IngredientForm onSuccess={() => setIsCreateOpen(false)} />
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={isEditOpen}
                        onOpenChange={(open) => {
                            setIsEditOpen(open);
                            if (!open) setSelectedIngredient(null);
                        }}
                    >
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Editar Ingrediente</DialogTitle>
                            </DialogHeader>
                            {selectedIngredient && (
                                <IngredientForm
                                    ingredient={selectedIngredient}
                                    onSuccess={() => setIsEditOpen(false)}
                                />
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>


            {/* Low Stock Alert */}
            {lowStock && lowStock.length > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>{lowStock.length} productos</strong> tienen stock bajo el mínimo
                    </AlertDescription>
                </Alert>
            )}


            {/* Search Bar */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar ingredientes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                {/* TODO: Filtros por familia y proveedor */}
            </div>


            {/* List */}
            <IngredientsList
                data={data?.data || []}
                pagination={data?.pagination}
                isLoading={isLoading}
                onPageChange={setPage}
                onEdit={(ingredient) => {
                    setSelectedIngredient(ingredient);
                    setIsEditOpen(true);
                }}
            />
        </div>
    );
}
