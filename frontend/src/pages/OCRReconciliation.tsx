import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { FileUp, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

interface DeliveryNote {
    id: string;
    status: 'PENDING_REVIEW' | 'RECONCILED' | 'DISCREPANCY';
    total_amount: number;
    image_url: string;
    extracted_data: {
        supplier_name?: string;
        items: any[];
    };
    created_at: string;
}

const OCRReconciliation: React.FC = () => {
    const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
    const { toast } = useToast();

    const mockNotes: DeliveryNote[] = [
        {
            id: '1',
            status: 'PENDING_REVIEW',
            total_amount: 145.50,
            image_url: 'https://placehold.co/600x800?text=Albaran+Mock',
            extracted_data: {
                supplier_name: 'PESCADOS GARCIA',
                items: [
                    { description: 'Rodaballo Salvaje', quantity: 5, unit_price: 22.5, total: 112.5 },
                    { description: 'Cigala Tronco G', quantity: 1, unit_price: 33, total: 33 }
                ]
            },
            created_at: new Date().toISOString()
        }
    ];

    const handleUpload = () => {
        toast({
            title: "Subiendo albarán",
            description: "El sistema está procesando la imagen con OCR...",
        });
    };

    return (
        <div className="container mx-auto p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reconciliación de Albaranes</h1>
                <Button onClick={handleUpload}>
                    <FileUp className="mr-2 h-4 w-4" /> Subir Albarán
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sidebar: List of notes */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Pendientes de Revisión</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px]">
                            <div className="space-y-4">
                                {mockNotes.map(note => (
                                    <div
                                        key={note.id}
                                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedNote?.id === note.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                                        onClick={() => setSelectedNote(note)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-semibold">{note.extracted_data.supplier_name}</span>
                                            <span className="text-sm font-mono">{note.total_amount}€</span>
                                        </div>
                                        <div className="flex items-center text-xs text-muted-foreground">
                                            <AlertCircle className="mr-1 h-3 w-3 text-amber-500" />
                                            {new Date(note.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Main Area: Detailed View & Reconciliation */}
                <Card className="md:col-span-2">
                    {!selectedNote ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground p-12">
                            Selecciona un albarán para comenzar la reconciliación
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <CardHeader className="border-b">
                                <div className="flex justify-between items-center">
                                    <CardTitle>Detalle del Albarán: {selectedNote.extracted_data.supplier_name}</CardTitle>
                                    <Button variant="outline" size="sm">
                                        <Eye className="mr-2 h-4 w-4" /> Ver Imagen
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1">
                                <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-x">
                                    {/* Left: Extracted Data */}
                                    <div className="p-6">
                                        <h3 className="font-semibold mb-4">Datos Extraídos (OCR)</h3>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left pb-2">Item</th>
                                                    <th className="text-right pb-2">Cant.</th>
                                                    <th className="text-right pb-2">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedNote.extracted_data.items.map((item, i) => (
                                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                        <td className="py-3">{item.description}</td>
                                                        <td className="text-right py-3">{item.quantity}</td>
                                                        <td className="text-right py-3 font-mono">{item.total}€</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Right: Reconciliation Options */}
                                    <div className="p-6 bg-muted/30">
                                        <h3 className="font-semibold mb-4 text-primary">Vinculación con Pedidos</h3>
                                        <div className="space-y-4">
                                            <div className="p-4 bg-white rounded-lg border shadow-sm">
                                                <p className="text-sm font-medium mb-1">Pedido #PO-2025-001</p>
                                                <p className="text-xs text-muted-foreground mb-3">Fecha: 20/01/2025 | Total: 150.00€</p>
                                                <div className="flex items-center text-xs text-amber-600 mb-4 font-medium">
                                                    <AlertCircle className="mr-1 h-3 w-3" /> Discrepancia encontrada: -4.50€
                                                </div>
                                                <Button className="w-full" size="sm">
                                                    <CheckCircle className="mr-2 h-4 w-4" /> Confirmar Recepción
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default OCRReconciliation;
