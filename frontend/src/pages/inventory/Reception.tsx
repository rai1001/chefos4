import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryNotesService, DeliveryNoteItem } from '@/services/delivery-notes.service';
import { ingredientsService } from '@/services/ingredients.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function InventoryReception({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const { data: notes = [] } = useQuery({
    queryKey: ['delivery-notes'],
    queryFn: () => deliveryNotesService.list(),
  });
  const { data: ingredientsData } = useQuery({
    queryKey: ['ingredients', 'all'],
    queryFn: () => ingredientsService.getAll({ limit: 1000 }),
  });

  const ingredients = ingredientsData?.data || [];
  const ingredientMap = useMemo(
    () => new Map(ingredients.map((ing: any) => [ing.id, ing as any])),
    [ingredients],
  );

  const updateItemMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<DeliveryNoteItem> }) =>
      deliveryNotesService.updateItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (noteId: string) => deliveryNotesService.importToInventory(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
    },
  });

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold">Recepción de Albaranes</h1>
          <p className="text-muted-foreground">Revisa y conecta líneas OCR con ingredientes.</p>
        </div>
      )}

      <div className="space-y-4">
        {notes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Albarán #{note.id.slice(0, 8)}</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleString('es-ES')}
                </div>
              </div>
              <Badge variant={note.status === 'RECONCILED' ? 'default' : 'secondary'}>
                {note.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {(note.items || []).map((item) => {
                  const ingredient = item.ingredient_id
                    ? ingredientMap.get(item.ingredient_id)
                    : undefined;
                  return (
                    <div key={item.id} className="grid grid-cols-6 gap-2 items-center text-sm">
                      <div className="col-span-2 font-medium">{item.description}</div>
                      <div>{item.quantity}</div>
                      <Select
                        value={item.ingredient_id || ''}
                        onValueChange={(val) => {
                          const selected = ingredientMap.get(val);
                          updateItemMutation.mutate({
                            id: item.id,
                            payload: {
                              ingredient_id: val,
                              unit_id: (selected as any)?.unit_id || undefined,
                              status: 'LINKED',
                            },
                          });
                        }}
                      >
                        <SelectTrigger aria-label="Seleccionar ingrediente">
                          <SelectValue placeholder="Ingrediente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ing: any) => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Lote"
                        aria-label="Código de lote"
                        defaultValue={item.lot_code || ''}
                        onBlur={(e) =>
                          updateItemMutation.mutate({
                            id: item.id,
                            payload: { lot_code: e.target.value || null },
                          })
                        }
                      />
                      <Input
                        type="date"
                        aria-label="Fecha de caducidad"
                        defaultValue={item.expiry_date || ''}
                        onBlur={(e) =>
                          updateItemMutation.mutate({
                            id: item.id,
                            payload: { expiry_date: e.target.value || null },
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          updateItemMutation.mutate({
                            id: item.id,
                            payload: { status: item.status === 'IGNORED' ? 'PENDING' : 'IGNORED' },
                          })
                        }
                      >
                        {item.status === 'IGNORED' ? 'Reactivar' : 'Ignorar'}
                      </Button>
                      <>
                        {ingredient && (
                          <div className="col-span-6 text-xs text-muted-foreground">
                            Unidad: {(ingredient as any)?.units?.abbreviation || 'N/D'}
                          </div>
                        )}
                      </>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => importMutation.mutate(note.id)}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importar a Inventario
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {notes.length === 0 && (
          <div className="text-sm text-muted-foreground">No hay albaranes pendientes.</div>
        )}
      </div>
    </div>
  );
}
