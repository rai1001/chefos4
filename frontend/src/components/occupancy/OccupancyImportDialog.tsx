import { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { occupancyService, OccupancyImportType } from '@/services/occupancy.service';

interface OccupancyImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    importType: OccupancyImportType;
    onSuccess: () => void;
}

export function OccupancyImportDialog({ open, onOpenChange, importType, onSuccess }: OccupancyImportDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [preview, setPreview] = useState<any>(null);
    const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        const extensionOk = selected && /\.(csv|xlsx|xls)$/i.test(selected.name);
        if (selected && extensionOk) {
            setFile(selected);
            setError(null);
            setImportResult(null);
            handlePreview(selected);
        } else {
            setError('Por favor sube un archivo CSV o Excel valido.');
        }
    };

    const handlePreview = async (selectedFile: File) => {
        try {
            setIsLoading(true);
            const res = await occupancyService.importFile(selectedFile, importType, true);
            setPreview(res);
        } catch (err: any) {
            setError('Error al analizar el CSV/Excel: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (!file) return;
        try {
            setIsLoading(true);
            const res = await occupancyService.importFile(file, importType, false);
            setImportResult(res);
            toast({
                title: 'Importacion completada',
                description: `Se importaron ${res.imported} filas. ${res.errors.length} errores.`,
                variant: res.errors.length > 0 ? 'destructive' : 'default',
            });
            if (res.imported > 0) onSuccess();
        } catch (err: any) {
            toast({
                title: 'Error de importacion',
                description: err.response?.data?.error || err.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const title = importType === 'forecast' ? 'Importar previsiones' : 'Importar reales';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Sube un CSV/Excel con columnas Fecha + Desayunos/Comidas/Cenas (las tres ultimas).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!file ? (
                        <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer relative">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <p className="text-sm font-medium">Click para subir o arrastra un CSV/Excel</p>
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
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
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setFile(null); setPreview(null); setImportResult(null); setError(null); }}
                            >
                                Cambiar
                            </Button>
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
                                    <li key={i} className="truncate">
                                        • {row.service_date} (D:{row.breakfasts ?? 0} C:{row.lunches ?? 0} Ce:{row.dinners ?? 0})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {importResult && (
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                            <div className="text-sm font-medium">
                                Resultado: {importResult.imported} importados, {importResult.errors.length} errores
                            </div>
                            {importResult.errors.length > 0 && (
                                <ul className="text-xs space-y-1 text-destructive">
                                    {importResult.errors.slice(0, 10).map((row, i) => (
                                        <li key={i} className="truncate">• {row}</li>
                                    ))}
                                    {importResult.errors.length > 10 && (
                                        <li>… {importResult.errors.length - 10} mas</li>
                                    )}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button disabled={!file || isLoading} onClick={handleImport}>
                        Confirmar importacion
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
