import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButtons({ reportType }: { reportType: string }) {
  return (
    <Button variant="outline" size="sm" className="h-8 gap-1">
      <Download className="h-3.5 w-3.5" />
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
        Exportar
      </span>
    </Button>
  );
}
