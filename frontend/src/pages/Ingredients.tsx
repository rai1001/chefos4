import { useState } from 'react';
import { Plus, Search, Upload } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useIngredients } from '@/hooks/useIngredients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IngredientsList } from '@/components/ingredients/IngredientsList';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { CSVImportWizard } from '@/components/ingredients/CSVImportWizard';
import { Ingredient } from '@/services/ingredients.service';


export default function Ingredients() {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);
    const [page, setPage] = useState(1);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);


    const { data, isLoading } = useIngredients({ page, limit: 20, search: debouncedSearch });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Ingredientes</h1>
                    <p className="text-muted-foreground">
                        Gestiona el catálogo para compras y recetas
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
