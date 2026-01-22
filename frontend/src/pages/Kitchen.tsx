import { useState } from 'react';
import { QrCode, Package, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickScanner } from '@/components/kitchen/QuickScanner';
import { StockOutForm } from '@/components/kitchen/StockOutForm';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';


export default function Kitchen() {
    const [scannerOpen, setScannerOpen] = useState(false);
    const [stockOutOpen, setStockOutOpen] = useState(false);


    return (
        <div className="space-y-6 max-w-lg mx-auto p-4">
            <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight">Portal de Cocina</h1>
                <p className="text-muted-foreground">
                    Gestión rápida de stock y producción
                </p>
            </div>


            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border-primary/20 shadow-md hover:shadow-xl group" onClick={() => setScannerOpen(true)}>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-3 text-2xl group-hover:text-primary transition-colors">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20">
                                <QrCode className="h-8 w-8 text-primary" />
                            </div>
                            Escáner Rápido
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Escanea códigos QR para salidas rápidas de stock. Ideal para raciones individuales o ingredientes pesados.
                        </p>
                    </CardContent>
                </Card>


                <Card className="cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border-blue-200 shadow-md hover:shadow-xl group" onClick={() => setStockOutOpen(true)}>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-3 text-2xl group-hover:text-blue-600 transition-colors">
                            <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100">
                                <TrendingDown className="h-8 w-8 text-blue-600" />
                            </div>
                            Salida Manual
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Registra salidas de stock manualmente si no tienes un código QR a mano.
                        </p>
                    </CardContent>
                </Card>


                <Card className="cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border-destructive/20 shadow-md hover:shadow-xl group">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-3 text-2xl group-hover:text-destructive transition-colors">
                            <div className="p-2 rounded-lg bg-destructive/10 group-hover:bg-destructive/20">
                                <Package className="h-8 w-8 text-destructive" />
                            </div>
                            Registrar Merma
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Reporta desperdicios, productos dañados o mermas de producción para mantener el coste real.
                        </p>
                    </CardContent>
                </Card>
            </div>


            {/* Scanner Modal */}
            <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="p-6 bg-primary text-primary-foreground border-none">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <QrCode className="h-6 w-6" />
                            Escáner QR
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6">
                        <QuickScanner onSuccess={() => setScannerOpen(false)} />
                    </div>
                </DialogContent>
            </Dialog>


            {/* Stock Out Modal */}
            <Dialog open={stockOutOpen} onOpenChange={setStockOutOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <TrendingDown className="h-6 w-6 text-blue-600" />
                            Salida de Stock
                        </DialogTitle>
                    </DialogHeader>
                    <StockOutForm onSuccess={() => setStockOutOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
