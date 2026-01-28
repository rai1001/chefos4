import { Button } from '@/components/ui/button';

export function ExportButtons({ reportType }: { reportType: string }) {
    return (
        <Button variant="outline">
            Exportar {reportType}
        </Button>
    );
}
