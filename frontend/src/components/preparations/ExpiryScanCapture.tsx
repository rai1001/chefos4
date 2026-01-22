import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { preparationsService } from '@/services/preparations.service';

interface ExpiryScanCaptureProps {
    batchId: string;
    onConfirm: (date: string) => void;
}

export function ExpiryScanCapture({ batchId, onConfirm }: ExpiryScanCaptureProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [candidates, setCandidates] = useState<{ date: string; confidence: number; raw: string }[]>([]);

    const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsScanning(true);
        try {
            const result = await preparationsService.scanExpiry(batchId, file);
            setCandidates(result.candidates);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="space-y-2">
            <input type="file" accept="image/*" onChange={onFileChange} />
            {isScanning && <div className="text-xs text-muted-foreground">Escaneando...</div>}
            {candidates.length > 0 && (
                <div className="space-y-1">
                    {candidates.map((candidate) => (
                        <Button
                            key={`${candidate.date}-${candidate.raw}`}
                            type="button"
                            variant="outline"
                            onClick={() => onConfirm(candidate.date)}
                            className="w-full justify-between text-xs"
                        >
                            <span>{candidate.date}</span>
                            <span>{Math.round(candidate.confidence * 100)}%</span>
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
