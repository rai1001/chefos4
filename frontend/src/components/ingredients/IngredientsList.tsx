import { useState } from 'react';
import { Edit, Trash2, Package } from 'lucide-react';
import { Ingredient } from '@/services/ingredients.service';
import { useDeleteIngredient } from '@/hooks/useIngredients';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';


interface IngredientsListProps {
    data: Ingredient[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    isLoading: boolean;
    onPageChange: (page: number) => void;
    onEdit?: (ingredient: Ingredient) => void;
}


export function IngredientsList({
    data,
    pagination,
    isLoading,
    onPageChange,
    onEdit,
}: IngredientsListProps) {
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const deleteMutation = useDeleteIngredient();


    const handleDelete = () => {
        if (deleteId) {
            deleteMutation.mutate(deleteId);
            setDeleteId(null);
        }
    };


    if (isLoading) {
        return <div>Cargando...</div>;
    }


    return (
        <>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Familia</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((ingredient) => (
                            <TableRow key={ingredient.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        {ingredient.name}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {ingredient.product_families?.name || '-'}
                                </TableCell>
                                <TableCell>
                                    {ingredient.suppliers?.name || '-'}
                                </TableCell>
                                <TableCell>
                                    {formatCurrency(ingredient.cost_price)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            iconOnly
                                            onClick={() => onEdit?.(ingredient)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteId(ingredient.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>


            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between py-4">
                    <p className="text-sm text-muted-foreground">
                        Mostrando {data.length} de {pagination.total} ingredientes
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            disabled={pagination.page === 1}
                            onClick={() => onPageChange(pagination.page - 1)}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            disabled={pagination.page === pagination.totalPages}
                            onClick={() => onPageChange(pagination.page + 1)}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}


            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar ingrediente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. El ingrediente será marcado como
                            eliminado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
