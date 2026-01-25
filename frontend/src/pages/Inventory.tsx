import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportButtons } from '@/components/reports/ExportButtons';
import InventoryReception from '@/pages/inventory/Reception';
import InventoryStock from '@/pages/inventory/Stock';
import InventoryExpiry from '@/pages/inventory/Expiry';
import InventoryStockOut from '@/pages/inventory/StockOut';
import InventoryCycleCounts from '@/pages/inventory/CycleCounts';
import InventoryLocations from '@/pages/inventory/Locations';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { RecordWasteForm } from '@/components/waste/RecordWasteForm';
import { Trash2 } from 'lucide-react';

const tabs = [
    { value: 'stock', label: 'Stock' },
    { value: 'reception', label: 'Recepcion' },
    { value: 'expiry', label: 'Caducidades' },
    { value: 'stock-out', label: 'Salidas' },
    { value: 'cycle-counts', label: 'Recuentos' },
    { value: 'locations', label: 'Ubicaciones' },
];

export default function Inventory() {
    const [activeTab, setActiveTab] = useState('stock');
    const [isWasteOpen, setIsWasteOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Inventario</h1>
                    <p className="text-muted-foreground">
                        Recepcion, caducidades, salidas, recuentos y ubicaciones.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isWasteOpen} onOpenChange={setIsWasteOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="gap-2">
                                <Trash2 className="h-4 w-4" />
                                Registrar Merma
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Registrar Merma</DialogTitle>
                                <DialogDescription>
                                    Registra pérdidas de inventario para seguimiento y análisis.
                                </DialogDescription>
                            </DialogHeader>
                            <RecordWasteForm onSuccess={() => setIsWasteOpen(false)} />
                        </DialogContent>
                    </Dialog>
                    <ExportButtons reportType="inventory" />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="stock">
                    {activeTab === 'stock' && <InventoryStock embedded />}
                </TabsContent>
                <TabsContent value="reception">
                    {activeTab === 'reception' && <InventoryReception embedded />}
                </TabsContent>
                <TabsContent value="expiry">
                    {activeTab === 'expiry' && <InventoryExpiry embedded />}
                </TabsContent>
                <TabsContent value="stock-out">
                    {activeTab === 'stock-out' && <InventoryStockOut embedded />}
                </TabsContent>
                <TabsContent value="cycle-counts">
                    {activeTab === 'cycle-counts' && <InventoryCycleCounts embedded />}
                </TabsContent>
                <TabsContent value="locations">
                    {activeTab === 'locations' && <InventoryLocations embedded />}
                </TabsContent>
            </Tabs>
        </div>
    );
}
