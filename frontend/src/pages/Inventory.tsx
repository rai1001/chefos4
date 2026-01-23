import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryReception from '@/pages/inventory/Reception';
import InventoryStock from '@/pages/inventory/Stock';
import InventoryExpiry from '@/pages/inventory/Expiry';
import InventoryStockOut from '@/pages/inventory/StockOut';
import InventoryCycleCounts from '@/pages/inventory/CycleCounts';
import InventoryLocations from '@/pages/inventory/Locations';

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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Inventario</h1>
                <p className="text-muted-foreground">
                    Recepcion, caducidades, salidas, recuentos y ubicaciones.
                </p>
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
