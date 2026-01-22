import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useProductFamilies } from '@/hooks/useProductFamilies';
import { api } from '@/services/api';


type Step = 'UPLOAD' | 'RESOLVE' | 'IMPORTING' | 'COMPLETE';


interface ConflictResolution {
    supplier_name: string;
    action: 'CREATE' | 'LINK';
    link_to_id?: string;
    default_family_id?: string;
}


interface AnalysisResult {
    total_rows: number;
    unknown_suppliers: string[];
    preview: any[];
}


interface ImportResult {
    imported: number;
    updated: number;
    created_suppliers: number;
    errors: string[];
}


export function CSVImportWizard({ onComplete }: { onComplete?: () => void }) {
    const [step, setStep] = useState<Step>('UPLOAD');
    const [file, setFile] = useState<File | null>(null);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);


    const { data: suppliers } = useSuppliers();
    const { data: families } = useProductFamilies();


    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };


    const handleAnalyze = async () => {
        if (!file) return;


        const formData = new FormData();
        formData.append('file', file);


        try {
            const response = await api.post('/ingredients/import/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });


            setAnalysis(response.data);


            if (response.data.unknown_suppliers.length > 0) {
                // Inicializar resoluciones con CREATE por defecto
                setResolutions(
                    response.data.unknown_suppliers.map((name: string) => ({
                        supplier_name: name,
                        action: 'CREATE' as const,
                    }))
                );
                setStep('RESOLVE');
            } else {
                // No hay conflictos, importar directamente
                handleImport();
            }
        } catch (error) {
            console.error('Error analyzing CSV:', error);
        }
    };


    const handleImport = async () => {
        if (!file) return;


        setStep('IMPORTING');


        const formData = new FormData();
        formData.append('file', file);
        formData.append('resolutions', JSON.stringify(resolutions));


        try {
            const response = await api.post('/ingredients/import/execute', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });


            setImportResult(response.data);
            setStep('COMPLETE');
            onComplete?.();
        } catch (error) {
            console.error('Error importing CSV:', error);
            setStep('RESOLVE');
        }
    };


    const updateResolution = (supplierName: string, updates: Partial<ConflictResolution>) => {
        setResolutions((prev) =>
            prev.map((r) =>
                r.supplier_name === supplierName ? { ...r, ...updates } : r
            )
        );
    };


    return (
        <div className="space-y-6">
            {/* Progress Indicator */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                    <span>
                        Paso {step === 'UPLOAD' ? 1 : step === 'RESOLVE' ? 2 : 3} de 3
                    </span>
                    <span className="text-muted-foreground">
                        {step === 'UPLOAD' && 'Subir archivo'}
                        {step === 'RESOLVE' && 'Resolver conflictos'}
                        {(step === 'IMPORTING' || step === 'COMPLETE') && 'Importando'}
                    </span>
                </div>
                <Progress
                    value={
                        step === 'UPLOAD'
                            ? 33
                            : step === 'RESOLVE'
                                ? 66
                                : 100
                    }
                />
            </div>


            {/* STEP 1: Upload */}
            {step === 'UPLOAD' && (
                <div className="space-y-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            El archivo CSV/Excel debe contener las columnas: Nombre Artículo,{' '}
                            Proveedor, Precio, Unidad
                        </AlertDescription>
                    </Alert>


                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 transition-colors hover:bg-muted/50">
                        <label className="flex flex-col items-center cursor-pointer">
                            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                            <div className="text-center">
                                <p className="text-lg font-medium">
                                    Selecciona un archivo CSV o Excel
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Arrastra y suelta o haz clic para buscar
                                </p>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileSelect}
                            />
                        </label>
                        {file && (
                            <p className="mt-4 text-sm text-primary font-medium">
                                Archivo seleccionado: {file.name}
                            </p>
                        )}
                    </div>


                    <Button
                        onClick={handleAnalyze}
                        disabled={!file}
                        className="w-full h-12 text-lg"
                    >
                        Analizar Archivo
                    </Button>
                </div>
            )}


            {/* STEP 2: Resolve Conflicts */}
            {step === 'RESOLVE' && analysis && (
                <div className="space-y-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Se encontraron {analysis.unknown_suppliers.length} proveedores{' '}
                            desconocidos. Decide si crear nuevos o vincular a existentes.
                        </AlertDescription>
                    </Alert>


                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {resolutions.map((resolution) => (
                            <div
                                key={resolution.supplier_name}
                                className="p-4 rounded-lg border bg-card space-y-3"
                            >
                                <div className="font-semibold text-lg flex items-center gap-2">
                                    {resolution.supplier_name}
                                    <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full border">
                                        ¿Cómo manejar este proveedor?
                                    </span>
                                </div>


                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        variant={resolution.action === 'CREATE' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() =>
                                            updateResolution(resolution.supplier_name, { action: 'CREATE' })
                                        }
                                    >
                                        Crear Nuevo
                                    </Button>


                                    <div className="flex-1 min-w-[200px]">
                                        <Select
                                            value={resolution.action === 'LINK' ? resolution.link_to_id : ''}
                                            onValueChange={(value) =>
                                                updateResolution(resolution.supplier_name, {
                                                    action: 'LINK',
                                                    link_to_id: value,
                                                })
                                            }
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Vincular a existente..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {suppliers?.data?.map((supplier: any) => (
                                                    <SelectItem key={supplier.id} value={supplier.id}>
                                                        {supplier.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {resolution.action === 'CREATE' && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">
                                            Familia por defecto (opcional)
                                        </span>
                                        <Select
                                            value={resolution.default_family_id || '__none__'}
                                            onValueChange={(value) =>
                                                updateResolution(resolution.supplier_name, {
                                                    default_family_id:
                                                        value === '__none__' ? undefined : value,
                                                })
                                            }
                                        >
                                            <SelectTrigger className="h-9 w-[240px]">
                                                <SelectValue placeholder="Sin familia" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">Sin familia</SelectItem>
                                                {(families || []).map((family: any) => (
                                                    <SelectItem key={family.id} value={family.id}>
                                                        {family.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>


                    <Button onClick={handleImport} className="w-full h-12 text-lg">
                        Importar {analysis.total_rows} productos
                    </Button>
                </div>
            )}


            {/* STEP 3: Importing */}
            {step === 'IMPORTING' && (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-xl font-medium">Importando productos...</p>
                </div>
            )}


            {/* STEP 4: Complete */}
            {step === 'COMPLETE' && importResult && (
                <div className="space-y-6">
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 font-medium">
                            ¡Importación completada!
                        </AlertDescription>
                    </Alert>


                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border bg-card text-center">
                            <p className="text-sm text-muted-foreground">Productos creados</p>
                            <p className="text-3xl font-bold text-primary">
                                {importResult.imported}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card text-center">
                            <p className="text-sm text-muted-foreground">Productos actualizados</p>
                            <p className="text-3xl font-bold text-blue-600">
                                {importResult.updated}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card text-center">
                            <p className="text-sm text-muted-foreground">Proveedores creados</p>
                            <p className="text-3xl font-bold text-purple-600">
                                {importResult.created_suppliers}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card text-center">
                            <p className="text-sm text-muted-foreground">Errores</p>
                            <p className="text-3xl font-bold text-destructive">
                                {importResult.errors.length}
                            </p>
                        </div>
                    </div>


                    {importResult.errors.length > 0 && (
                        <div className="p-4 rounded-lg border bg-destructive/5 space-y-2">
                            <p className="text-sm font-semibold text-destructive">Errores:</p>
                            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1 max-h-[150px] overflow-y-auto">
                                {importResult.errors.slice(0, 5).map((error: string, i: number) => (
                                    <li key={i}>{error}</li>
                                ))}
                                {importResult.errors.length > 5 && (
                                    <li>...y {importResult.errors.length - 5} más</li>
                                )}
                            </ul>
                        </div>
                    )}


                    <Button
                        onClick={() => {
                            setStep('UPLOAD');
                            setFile(null);
                            setAnalysis(null);
                            setResolutions([]);
                            setImportResult(null);
                        }}
                        className="w-full h-12 text-lg"
                    >
                        Importar otro archivo
                    </Button>
                </div>
            )}
        </div>
    );
}
