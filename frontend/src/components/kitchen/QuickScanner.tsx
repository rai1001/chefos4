import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Zap, ShieldCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


export function QuickScanner({ onSuccess }: { onSuccess?: () => void }) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScan, setLastScan] = useState<string | null>(null);
    const [burstMode, setBurstMode] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');


    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, []);


    const startScanning = async () => {
        try {
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;


            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 15,
                    qrbox: { width: 280, height: 280 },
                },
                (decodedText) => {
                    handleScan(decodedText);
                },
                (errorMessage) => {
                    // Ignorar errores de no detección
                }
            );


            setIsScanning(true);
            setStatus('IDLE');
        } catch (error) {
            console.error('Error starting scanner:', error);
        }
    };


    const stopScanning = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop();
            scannerRef.current = null;
            setIsScanning(false);
        }
    };


    const handleScan = async (code: string) => {
        if (status === 'PROCESSING') return;

        // Beep sound
        try {
            const audio = new Audio('/beep.mp3');
            audio.play().catch(() => { });
        } catch (e) { }


        setLastScan(code);


        if (burstMode) {
            // Modo ráfaga: descontar automáticamente
            await processStockOut(code, 1);
        } else {
            // Modo normal: mostrar confirmación
            await stopScanning();
            setStatus('IDLE');
        }
    };


    const processStockOut = async (code: string, quantity: number) => {
        setStatus('PROCESSING');
        try {
            // En un caso real, aquí iría una llamada a la API
            console.log(`Processing stock out: ${code}, quantity: ${quantity}`);

            // Simular latencia de red
            await new Promise(resolve => setTimeout(resolve, 800));

            setStatus('SUCCESS');
            setTimeout(() => setStatus('IDLE'), 2000);
        } catch (error) {
            setStatus('ERROR');
            setTimeout(() => setStatus('IDLE'), 3000);
        }
    };


    return (
        <div className="space-y-6">
            <div
                id="qr-reader"
                className="overflow-hidden rounded-xl border-4 border-muted aspect-square bg-black relative"
            >
                {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                        <Button
                            onClick={startScanning}
                            className="h-20 w-20 rounded-full shadow-2xl animate-pulse"
                        >
                            <Zap className="h-10 w-10 fill-current" />
                        </Button>
                    </div>
                )}
            </div>


            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div className="flex flex-col gap-1">
                    <Label htmlFor="burst-mode" className="text-lg font-bold flex items-center gap-2">
                        <Zap className={`h-5 w-5 ${burstMode ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                        Modo Ráfaga
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        Descontar 1 unidad automáticamente al escanear
                    </p>
                </div>
                <Switch
                    id="burst-mode"
                    checked={burstMode}
                    onCheckedChange={setBurstMode}
                />
            </div>


            {status === 'SUCCESS' && (
                <Alert className="bg-green-50 border-green-200 animate-in fade-in slide-in-from-bottom-2">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 font-bold">
                        Escaneado con éxito: {lastScan?.slice(0, 10)}...
                    </AlertDescription>
                </Alert>
            )}


            {isScanning && (
                <Button
                    variant="destructive"
                    onClick={stopScanning}
                    className="w-full text-lg h-12"
                >
                    Detener Escáner
                </Button>
            )}

            {!isScanning && status === 'IDLE' && lastScan && (
                <div className="space-y-4">
                    <div className="p-4 rounded-xl border bg-card text-center">
                        <p className="text-sm text-muted-foreground mb-1">Producto Detectado</p>
                        <p className="text-xl font-bold">{lastScan}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 h-12" onClick={() => { setLastScan(null); startScanning(); }}>
                            Escanear Otro
                        </Button>
                        <Button className="flex-1 h-12" onClick={() => processStockOut(lastScan, 1)}>
                            Confirmar Salida
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
