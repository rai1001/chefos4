
import { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

interface EventImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EventImportDialog({ open, onOpenChange, onSuccess }: EventImportDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [preview, setPreview] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected && selected.type === 'text/csv') {
            setFile(selected);
            setError(null);
            handlePreview(selected);
        } else {
            setError('Por favor sube un archivo CSV válido.');
        }
    };

    const handlePreview = async (selectedFile: File) => {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('dryRun', 'true');

        try {
            setIsLoading(true);
            const res = await api.post('/events/import', formData);
            setPreview(res.data.data);
        } catch (err: any) {
            setError('Error al analizar el CSV: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('dryRun', 'false');

        try {
            setIsLoading(true);
            const res = await api.post('/events/import', formData);
            const results = res.data.data;

            toast({
                title: 'Importación Completada',
                description: `Se importaron ${results.imported} eventos. ${results.errors.length} errores.`,
                variant: results.errors.length > 0 ? 'destructive' : 'default',
            });

            if (results.imported > 0) {
                onSuccess();
            }
        } catch (err: any) {
            toast({
                title: 'Error de Importación',
                description: err.response?.data?.error || err.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Importar Eventos</DialogTitle>
                    <DialogDescription>
                        Sube un archivo CSV con el formato: Nombre Evento, Tipo, Fecha Inicio, Pax, Recetas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!file ? (
                        <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer relative">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <p className="text-sm font-medium">Click para subir o arrastra un CSV</p>
                            <input
                                type="file"
                                accept=".csv"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                            <FileText className="h-8 w-8 text-primary" />
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setPreview(null); }}>Cambiar</Button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2 text-sm italic">Procesando...</span>
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {preview && (
                        <div className="rounded-lg border bg-blue-50/50 p-4 space-y-2">
                            <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                                <Check className="h-4 w-4" />
                                Vista previa: {preview.total_rows} filas detectadas
                            </div>
                            <ul className="text-xs space-y-1 text-blue-600/80">
                                {preview.preview.map((row: any, i: number) => (
                                    <li key={i} className="truncate">• {row.nombre_evento} ({row.fecha_inicio})</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button disabled={!file || isLoading} onClick={handleImport}>
                        Confirmar Importación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
