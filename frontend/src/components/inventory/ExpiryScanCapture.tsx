import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { inventoryService } from '@/services/inventory.service';

interface ExpiryScanCaptureProps {
    batchId: string;
    onConfirm: (date: string) => void;
}

export function ExpiryScanCapture({ batchId, onConfirm }: ExpiryScanCaptureProps) {
    const [candidates, setCandidates] = useState<{ date: string; confidence: number; raw: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleScan = async (file: File) => {
        setIsLoading(true);
        try {
            const result = await inventoryService.scanExpiry(batchId, file);
            setCandidates(result.candidates || []);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-3">
            <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleScan(file);
                }}
            />
            {isLoading && <div className="text-sm text-muted-foreground">Escaneando...</div>}
            {candidates.length > 0 && (
                <div className="space-y-2">
                    {candidates.map((candidate) => (
                        <Button
                            key={`${candidate.date}-${candidate.raw}`}
                            type="button"
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => onConfirm(candidate.date)}
                        >
                            <span>{candidate.date}</span>
                            <span className="text-xs text-muted-foreground">{candidate.raw}</span>
                        </Button>
                    ))}
                </div>
            )}
            {candidates.length === 0 && !isLoading && (
                <div className="text-xs text-muted-foreground">Sin candidatos. Ingresa fecha manual.</div>
            )}
        </div>
    );
}
