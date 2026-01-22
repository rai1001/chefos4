# SPRINT 09: OCR para Recepción de Albaranes 📸


**Duración:** 1 semana  
**Objetivo:** Implementar escaneo automático de albaranes con OCR y cotejo contra órdenes de compra.


---


## 🎯 ARQUITECTURA


### Migración: Delivery Notes Table


`supabase/migrations/20250220000001_delivery_notes.sql`:
````sql
-- =====================================================
-- DELIVERY NOTES: Albaranes de entrega
-- =====================================================
CREATE TABLE delivery_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  
  -- Información del albarán
  delivery_note_number VARCHAR(100) NULL,
  supplier_reference VARCHAR(100) NULL,
  delivery_date DATE NOT NULL,
  
  -- OCR
  ocr_processed BOOLEAN DEFAULT FALSE,
  ocr_confidence DECIMAL(5,2) NULL, -- 0-100
  ocr_raw_text TEXT NULL,
  ocr_extracted_data JSONB DEFAULT '{}',
  
  -- Archivo
  file_path VARCHAR(500) NULL,
  file_type VARCHAR(50) NULL,
  
  -- Estado de cotejo
  reconciliation_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, MATCHED, DISCREPANCY, MANUAL_REVIEW
  discrepancies JSONB DEFAULT '[]',
  
  -- Notas
  notes TEXT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);


CREATE INDEX idx_delivery_notes_po ON delivery_notes(purchase_order_id);
CREATE INDEX idx_delivery_notes_org ON delivery_notes(organization_id);
CREATE INDEX idx_delivery_notes_status ON delivery_notes(reconciliation_status);


-- =====================================================
-- DELIVERY NOTE ITEMS: Líneas del albarán
-- =====================================================
CREATE TABLE delivery_note_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  
  -- Datos del albarán
  product_description VARCHAR(500) NOT NULL,
  quantity_delivered DECIMAL(12,3) NOT NULL,
  unit_description VARCHAR(50) NULL,
  unit_price DECIMAL(10,2) NULL,
  
  -- Match con PO
  matched_po_item_id UUID NULL REFERENCES purchase_order_items(id),
  match_confidence DECIMAL(5,2) NULL,
  
  -- Estado
  status VARCHAR(50) DEFAULT 'PENDING', -- MATCHED, NO_MATCH, EXTRA_ITEM
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE INDEX idx_dn_items_dn ON delivery_note_items(delivery_note_id);
CREATE INDEX idx_dn_items_po_item ON delivery_note_items(matched_po_item_id);


-- =====================================================
-- FUNCIÓN: Calcular discrepancias
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_delivery_discrepancies(p_delivery_note_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_discrepancies JSONB := '[]';
  v_po_item RECORD;
  v_dn_item RECORD;
BEGIN
  -- Obtener PO del albarán
  DECLARE
    v_po_id UUID;
  BEGIN
    SELECT purchase_order_id INTO v_po_id
    FROM delivery_notes
    WHERE id = p_delivery_note_id;
    
    -- Comparar items
    FOR v_po_item IN 
      SELECT poi.*, i.name as ingredient_name
      FROM purchase_order_items poi
      JOIN ingredients i ON poi.ingredient_id = i.id
      WHERE poi.purchase_order_id = v_po_id
    LOOP
      -- Buscar match en delivery note
      SELECT * INTO v_dn_item
      FROM delivery_note_items
      WHERE delivery_note_id = p_delivery_note_id
        AND matched_po_item_id = v_po_item.id
      LIMIT 1;
      
      IF NOT FOUND THEN
        -- Item no entregado
        v_discrepancies := v_discrepancies || jsonb_build_object(
          'type', 'MISSING',
          'po_item_id', v_po_item.id,
          'ingredient_name', v_po_item.ingredient_name,
          'expected_qty', v_po_item.quantity_ordered,
          'received_qty', 0
        );
      ELSIF v_dn_item.quantity_delivered != v_po_item.quantity_ordered THEN
        -- Cantidad diferente
        v_discrepancies := v_discrepancies || jsonb_build_object(
          'type', 'QUANTITY_MISMATCH',
          'po_item_id', v_po_item.id,
          'ingredient_name', v_po_item.ingredient_name,
          'expected_qty', v_po_item.quantity_ordered,
          'received_qty', v_dn_item.quantity_delivered,
          'difference', v_dn_item.quantity_delivered - v_po_item.quantity_ordered
        );
      END IF;
    END LOOP;
    
    -- Buscar items extra (en albarán pero no en PO)
    FOR v_dn_item IN
      SELECT * FROM delivery_note_items
      WHERE delivery_note_id = p_delivery_note_id
        AND (matched_po_item_id IS NULL OR status = 'EXTRA_ITEM')
    LOOP
      v_discrepancies := v_discrepancies || jsonb_build_object(
        'type', 'EXTRA_ITEM',
        'product_description', v_dn_item.product_description,
        'quantity', v_dn_item.quantity_delivered
      );
    END LOOP;
  END;
  
  RETURN v_discrepancies;
END;
$$ LANGUAGE plpgsql;


COMMENT ON FUNCTION calculate_delivery_discrepancies IS 'Calcula discrepancias entre albarán y orden de compra';
````


---


### Backend - OCR Service con Google Vision API


`backend/src/services/ocr.service.ts`:
````typescript
import vision from '@google-cloud/vision';
import { logger } from '@/utils/logger';


interface OCRResult {
  confidence: number;
  raw_text: string;
  extracted_data: {
    delivery_note_number?: string;
    date?: string;
    items: Array;
  };
}


export class OCRService {
  private client: vision.ImageAnnotatorClient;


  constructor() {
    // Inicializar Google Vision API
    this.client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_VISION_KEY_PATH,
    });
  }


  /**
   * Procesar imagen de albarán
   */
  async processDeliveryNote(imageBuffer: Buffer): Promise {
    try {
      // 1. Detectar texto con Google Vision
      const [result] = await this.client.textDetection(imageBuffer);
      const detections = result.textAnnotations;


      if (!detections || detections.length === 0) {
        throw new Error('No text detected in image');
      }


      const rawText = detections[0].description || '';
      logger.info(`OCR detected ${rawText.length} characters`);


      // 2. Calcular confianza promedio
      const confidence = this.calculateConfidence(detections);


      // 3. Extraer datos estructurados
      const extractedData = this.parseDeliveryNoteText(rawText);


      return {
        confidence,
        raw_text: rawText,
        extracted_data: extractedData,
      };
    } catch (error) {
      logger.error('Error processing OCR:', error);
      throw error;
    }
  }


  /**
   * Parsear texto del albarán
   */
  private parseDeliveryNoteText(text: string): OCRResult['extracted_data'] {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);


    // Buscar número de albarán
    const deliveryNoteNumber = this.extractDeliveryNoteNumber(lines);


    // Buscar fecha
    const date = this.extractDate(lines);


    // Buscar tabla de productos
    const items = this.extractItems(lines);


    return {
      delivery_note_number: deliveryNoteNumber,
      date,
      items,
    };
  }


  private extractDeliveryNoteNumber(lines: string[]): string | undefined {
    const patterns = [
      /albar[aá]n\s*n[º°]?\s*:?\s*(\d+)/i,
      /delivery\s*note\s*:?\s*(\d+)/i,
      /n[º°]\s*albar[aá]n\s*:?\s*(\d+)/i,
    ];


    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }


    return undefined;
  }


  private extractDate(lines: string[]): string | undefined {
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;


    for (const line of lines) {
      const match = line.match(datePattern);
      if (match) {
        const [, day, month, year] = match;
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }


    return undefined;
  }


  private extractItems(lines: string[]): Array {
    const items: any[] = [];


    // Buscar patrones de tabla
    // Formato común: CANTIDAD UNIDAD DESCRIPCIÓN PRECIO
    const itemPattern = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]{1,3})?\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*€?$/;


    for (const line of lines) {
      const match = line.match(itemPattern);
      if (match) {
        const [, quantity, unit, description, price] = match;


        items.push({
          description: description.trim(),
          quantity: parseFloat(quantity.replace(',', '.')),
          unit: unit || undefined,
          price: parseFloat(price.replace(',', '.')),
        });
      }
    }


    return items;
  }


  private calculateConfidence(detections: vision.protos.google.cloud.vision.v1.IEntityAnnotation[]): number {
    if (detections.length <= 1) return 0;


    // Promediar confianza de las primeras 10 detecciones (excluyendo la primera que es el texto completo)
    const confidences = detections
      .slice(1, 11)
      .map((d) => d.confidence || 0);


    const avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    return Math.round(avg * 100);
  }
}
````


---


### Backend - Reconciliation Service


`backend/src/services/delivery-reconciliation.service.ts`:
````typescript
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';


export class DeliveryReconciliationService {
  /**
   * Cotejo automático de albarán con PO
   */
  async reconcileDeliveryNote(deliveryNoteId: string): Promise {
    try {
      // 1. Obtener albarán y PO
      const { data: deliveryNote } = await supabase
        .from('delivery_notes')
        .select('*, purchase_order:purchase_orders(*)')
        .eq('id', deliveryNoteId)
        .single();


      if (!deliveryNote) {
        throw new Error('Delivery note not found');
      }


      // 2. Obtener items del albarán
      const { data: dnItems } = await supabase
        .from('delivery_note_items')
        .select('*')
        .eq('delivery_note_id', deliveryNoteId);


      // 3. Obtener items de la PO
      const { data: poItems } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          ingredient:ingredients(id, name)
        `)
        .eq('purchase_order_id', deliveryNote.purchase_order_id);


      // 4. Intentar matching automático
      let matchedItems = 0;


      for (const dnItem of dnItems || []) {
        const match = this.findBestMatch(dnItem, poItems || []);


        if (match) {
          // Actualizar item con match
          await supabase
            .from('delivery_note_items')
            .update({
              matched_po_item_id: match.poItem.id,
              match_confidence: match.confidence,
              status: 'MATCHED',
            })
            .eq('id', dnItem.id);


          matchedItems++;
        }
      }


      // 5. Calcular discrepancias
      const { data: discrepancies } = await supabase.rpc(
        'calculate_delivery_discrepancies',
        { p_delivery_note_id: deliveryNoteId }
      );


      // 6. Determinar estado final
      let status: 'MATCHED' | 'DISCREPANCY' | 'MANUAL_REVIEW';


      if (discrepancies && discrepancies.length > 0) {
        status = 'DISCREPANCY';
      } else if (matchedItems === (dnItems?.length || 0)) {
        status = 'MATCHED';
      } else {
        status = 'MANUAL_REVIEW';
      }


      // 7. Actualizar delivery note
      await supabase
        .from('delivery_notes')
        .update({
          reconciliation_status: status,
          discrepancies,
        })
        .eq('id', deliveryNoteId);


      return {
        status,
        matched_items: matchedItems,
        discrepancies: discrepancies || [],
      };
    } catch (error) {
      logger.error('Error reconciling delivery note:', error);
      throw error;
    }
  }


  /**
   * Buscar mejor match entre item del albarán y PO
   */
  private findBestMatch(
    dnItem: any,
    poItems: any[]
  ): { poItem: any; confidence: number } | null {
    let bestMatch: { poItem: any; confidence: number } | null = null;


    for (const poItem of poItems) {
      const confidence = this.calculateMatchConfidence(
        dnItem.product_description,
        poItem.ingredient.name
      );


      if (confidence > 0.7 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { poItem, confidence: Math.round(confidence * 100) };
      }
    }


    return bestMatch;
  }


  /**
   * Calcular similitud entre strings (Levenshtein simplificado)
   */
  private calculateMatchConfidence(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();


    // Exact match
    if (s1 === s2) return 1.0;


    // Contains
    if (s1.includes(s2) || s2.includes(s1)) return 0.85;


    // Similitud básica por palabras comunes
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));


    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);


    return intersection.size / union.size;
  }
}
````


---


### Backend - Controller


`backend/src/controllers/delivery-notes.controller.ts`:
````typescript
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';
import { OCRService } from '@/services/ocr.service';
import { DeliveryReconciliationService } from '@/services/delivery-reconciliation.service';


export class DeliveryNotesController {
  async uploadAndProcess(req: AuthRequest, res: Response): Promise {
    try {
      const file = (req as any).file;
      const { purchase_order_id } = req.body;


      if (!file) {
        throw new AppError(400, 'No file uploaded');
      }


      const organizationId = req.user!.organizationIds[0];


      // 1. Procesar OCR
      const ocrService = new OCRService();
      const ocrResult = await ocrService.processDeliveryNote(file.buffer);


      // 2. Crear delivery note
      const { data: deliveryNote, error: dnError } = await supabase
        .from('delivery_notes')
        .insert({
          organization_id: organizationId,
          purchase_order_id,
          delivery_note_number: ocrResult.extracted_data.delivery_note_number,
          delivery_date: ocrResult.extracted_data.date || new Date().toISOString(),
          ocr_processed: true,
          ocr_confidence: ocrResult.confidence,
          ocr_raw_text: ocrResult.raw_text,
          ocr_extracted_data: ocrResult.extracted_data,
          created_by: req.user!.id,
        })
        .select()
        .single();


      if (dnError) throw dnError;


      // 3. Crear items del albarán
      if (ocrResult.extracted_data.items.length > 0) {
        const items = ocrResult.extracted_data.items.map((item) => ({
          delivery_note_id: deliveryNote.id,
          product_description: item.description,
          quantity_delivered: item.quantity,
          unit_description: item.unit,
          unit_price: item.price,
        }));


        await supabase.from('delivery_note_items').insert(items);
      }


      // 4. Intentar reconciliación automática
      const reconciliationService = new DeliveryReconciliationService();
      const reconciliation = await reconciliationService.reconcileDeliveryNote(
        deliveryNote.id
      );


      res.status(201).json({
        data: {
          ...deliveryNote,
          reconciliation,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error processing delivery note:', error);
      res.status(500).json({ error: 'Failed to process delivery note' });
    }
  }


  async getById(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      const { data, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          purchase_order:purchase_orders (
            id,
            supplier:suppliers (name)
          ),
          items:delivery_note_items (
            *,
            matched_po_item:purchase_order_items (
              *,
              ingredient:ingredients (name)
            )
          )
        `)
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (error || !data) {
        throw new AppError(404, 'Delivery note not found');
      }


      res.json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error fetching delivery note:', error);
      res.status(500).json({ error: 'Failed to fetch delivery note' });
    }
  }


  async approveReconciliation(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // 1. Verificar ownership
      const { data: deliveryNote } = await supabase
        .from('delivery_notes')
        .select('*, purchase_order:purchase_orders(*)')
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (!deliveryNote) {
        throw new AppError(404, 'Delivery note not found');
      }


      // 2. Actualizar cantidades recibidas en PO
      const { data: items } = await supabase
        .from('delivery_note_items')
        .select('*')
        .eq('delivery_note_id', id)
        .not('matched_po_item_id', 'is', null);


      for (const item of items || []) {
        await supabase
          .from('purchase_order_items')
          .update({ quantity_received: item.quantity_delivered })
          .eq('id', item.matched_po_item_id);
      }


      // 3. Actualizar estado de PO
      const allReceived = true; // TODO: Verificar si todos los items están recibidos


      await supabase
        .from('purchase_orders')
        .update({
          status: allReceived ? 'RECEIVED' : 'PARTIAL',
          delivery_date_actual: deliveryNote.delivery_date,
        })
        .eq('id', deliveryNote.purchase_order_id);


      res.json({ message: 'Reconciliation approved successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error approving reconciliation:', error);
      res.status(500).json({ error: 'Failed to approve reconciliation' });
    }
  }
}
````


---


### Frontend - Upload Component


`frontend/src/components/delivery-notes/UploadDeliveryNote.tsx`:
````tsx
import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { api } from '@/services/api';


interface UploadDeliveryNoteProps {
  purchaseOrderId: string;
  onSuccess?: (data: any) => void;
}


export function UploadDeliveryNote({ purchaseOrderId, onSuccess }: UploadDeliveryNoteProps) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);


  const handleFileSelect = (e: React.ChangeEvent) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };


  const handleUpload = async () => {
    if (!file) return;


    setUploading(true);
    setError(null);


    const formData = new FormData();
    formData.append('file', file);
    formData.append('purchase_order_id', purchaseOrderId);


    try {
      const response = await api.post('/delivery-notes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });


      setResult(response.data.data);
      onSuccess?.(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar el albarán');
    } finally {
      setUploading(false);
    }
  };


  return (
    
      {!result ? (
        <>
          
            
            
              Sube una foto o PDF del albarán. El sistema extraerá automáticamente los
              productos y cantidades.
            
          


          
            
              
              
                
                  
                    Selecciona un archivo
                  
                  
                
              
              {file && (
                
                  Archivo: {file.name}
                
              )}
            
          


          {uploading && (
            
              
                Procesando con OCR...
              
              
            
          )}


          {error && (
            
              
              {error}
            
          )}


          
            {uploading ? 'Procesando...' : 'Procesar Albarán'}
          
        </>
      ) : (
        
          
            
            
              Albarán procesado correctamente
              
              Confianza OCR: {result.ocr_confidence}%
            
          


          
            Resultado del cotejo
            
              
                Items coincidentes
                
                  {result.reconciliation.matched_items}
                
              
              
                Discrepancias
                
                  {result.reconciliation.discrepancies.length}
                
              
              
                Estado
                
                  {result.reconciliation.status}
                
              
            
          


          {result.reconciliation.discrepancies.length > 0 && (
            
              
                Discrepancias encontradas:
              
              
                {result.reconciliation.discrepancies.map((d: any, i: number) => (
                  
                    {d.type}: {d.ingredient_name || d.product_description}
                    {d.type === 'QUANTITY_MISMATCH' && (
                      <> - Esperado: {d.expected_qty}, Recibido: {d.received_qty}</>
                    )}
                  
                ))}
              
            
          )}


          <Button onClick={() => setResult(null)} variant="outline" className="w-full">
            Procesar otro albarán
          
        
      )}
    
  );
}
````


---


## 📅 SPRINT 10: Planificación con Gantt


### **`
