import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
    onDetected: (code: string) => void;
}

export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, []);

    const start = async () => {
        if (isScanning) return;
        try {
            const scanner = new Html5Qrcode('barcode-reader');
            scannerRef.current = scanner;
            await scanner.start(
                { facingMode: 'environment' },
                { fps: 15, qrbox: { width: 280, height: 180 } },
                (decodedText) => {
                    onDetected(decodedText);
                },
                () => { }
            );
            setIsScanning(true);
        } catch {
            setIsScanning(false);
        }
    };

    const stop = async () => {
        if (!scannerRef.current) return;
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
    };

    return (
        <div className="space-y-3">
            <div id="barcode-reader" className="rounded-lg border bg-black/80 aspect-video" />
            <div className="flex gap-2">
                <Button type="button" onClick={start} disabled={isScanning}>
                    Iniciar Escaneo
                </Button>
                <Button type="button" variant="outline" onClick={stop} disabled={!isScanning}>
                    Detener
                </Button>
            </div>
        </div>
    );
}
