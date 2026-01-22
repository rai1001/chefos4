
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SupplierCountdownProps {
    cutOffTime?: string;
    deliveryDays?: number[];
}

export function SupplierCountdown({ cutOffTime }: SupplierCountdownProps) {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!cutOffTime) return;

        const [hours, minutes, seconds] = cutOffTime.split(":").map(Number);
        const update = () => {
            const now = new Date();
            const cutoff = new Date();
            cutoff.setHours(hours, minutes, seconds || 0, 0);
            setTimeLeft(cutoff.getTime() - now.getTime());
        };

        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [cutOffTime]);

    if (!cutOffTime) return <span className="text-muted-foreground text-xs">Sin cutoff</span>;

    const minutesRem = timeLeft ? Math.floor(timeLeft / 60000) : null;
    const isUrgent = minutesRem !== null && minutesRem > 0 && minutesRem < 120;
    const hasPassed = minutesRem !== null && minutesRem < 0;

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
    };

    return (
        <div className="flex items-center gap-2">
            <div className={cn(
                "p-1.5 rounded-full",
                isUrgent ? "bg-orange-100 text-orange-600 animate-pulse shadow-sm shadow-orange-200" :
                    hasPassed ? "bg-red-50 text-red-500" :
                        "bg-blue-50 text-blue-600"
            )}>
                <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
                <span className={cn(
                    "text-xs font-mono font-medium tracking-tighter",
                    hasPassed ? "text-muted-foreground/50 line-through" :
                        isUrgent ? "text-orange-700 font-bold" :
                            "text-foreground"
                )}>
                    {timeLeft !== null ? (hasPassed ? "CERRADO" : formatTime(timeLeft)) : "--:--"}
                </span>
                {isUrgent && (
                    <span className="text-[9px] uppercase font-bold text-orange-500 leading-none">
                        Cierre Inminente
                    </span>
                )}
            </div>
        </div>
    );
}
