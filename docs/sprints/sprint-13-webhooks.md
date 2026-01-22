# SPRINT 13: API Webhooks para Integraciones 🔗


**Duración:** 1 semana  
**Objetivo:** Implementar sistema de webhooks para notificar eventos a aplicaciones externas en tiempo real.


---


## 🎯 ARQUITECTURA


### Migración: Webhooks System


`supabase/migrations/20250305000001_webhooks.sql`:
````sql
-- =====================================================
-- WEBHOOK ENDPOINTS: Endpoints configurados
-- =====================================================
CREATE TYPE webhook_event AS ENUM (
  'ingredient.created',
  'ingredient.updated',
  'ingredient.low_stock',
  'purchase_order.created',
  'purchase_order.sent',
  'purchase_order.received',
  'event.created',
  'event.confirmed',
  'delivery_note.processed',
  'waste.recorded',
  'notification.created'
);


CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Configuración del webhook
  url VARCHAR(500) NOT NULL,
  description VARCHAR(255) NULL,
  secret_key VARCHAR(100) NOT NULL, -- Para firmar payloads
  
  -- Eventos suscritos
  events webhook_event[] NOT NULL,
  
  -- Estado
  active BOOLEAN DEFAULT TRUE,
  
  -- Configuración de reintentos
  max_retries INTEGER DEFAULT 3,
  retry_backoff_seconds INTEGER DEFAULT 60,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);


CREATE INDEX idx_webhooks_org ON webhook_endpoints(organization_id);
CREATE INDEX idx_webhooks_active ON webhook_endpoints(active) WHERE active = true;


-- =====================================================
-- WEBHOOK DELIVERIES: Log de entregas
-- =====================================================
CREATE TYPE delivery_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');


CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  
  -- Evento disparado
  event_type webhook_event NOT NULL,
  event_id UUID NULL, -- ID del recurso (ingredient, PO, etc.)
  
  -- Payload enviado
  payload JSONB NOT NULL,
  
  -- Request/Response
  request_headers JSONB NULL,
  response_status_code INTEGER NULL,
  response_body TEXT NULL,
  response_time_ms INTEGER NULL,
  
  -- Estado y reintentos
  status delivery_status DEFAULT 'PENDING',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ NULL,
  next_retry_at TIMESTAMPTZ NULL,
  
  -- Error info
  error_message TEXT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);


CREATE INDEX idx_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id);
CREATE INDEX idx_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX idx_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'RETRYING';
CREATE INDEX idx_deliveries_created ON webhook_deliveries(created_at DESC);


-- =====================================================
-- FUNCIÓN: Crear delivery de webhook
-- =====================================================
CREATE OR REPLACE FUNCTION create_webhook_delivery(
  p_org_id UUID,
  p_event_type webhook_event,
  p_event_id UUID,
  p_payload JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_endpoint RECORD;
  v_deliveries_created INTEGER := 0;
BEGIN
  -- Buscar webhooks activos suscritos a este evento
  FOR v_endpoint IN
    SELECT * FROM webhook_endpoints
    WHERE organization_id = p_org_id
      AND active = true
      AND p_event_type = ANY(events)
  LOOP
    -- Crear delivery
    INSERT INTO webhook_deliveries (
      webhook_endpoint_id,
      event_type,
      event_id,
      payload,
      status
    ) VALUES (
      v_endpoint.id,
      p_event_type,
      p_event_id,
      p_payload,
      'PENDING'
    );
    
    v_deliveries_created := v_deliveries_created + 1;
  END LOOP;
  
  RETURN v_deliveries_created;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- TRIGGERS: Auto-crear deliveries
-- =====================================================


-- Trigger: Ingredient low stock
CREATE OR REPLACE FUNCTION trigger_webhook_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_current <= NEW.stock_min AND OLD.stock_current > OLD.stock_min THEN
    PERFORM create_webhook_delivery(
      NEW.organization_id,
      'ingredient.low_stock',
      NEW.id,
      jsonb_build_object(
        'ingredient_id', NEW.id,
        'name', NEW.name,
        'current_stock', NEW.stock_current,
        'min_stock', NEW.stock_min,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER webhook_ingredient_low_stock
  AFTER UPDATE OF stock_current ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_webhook_low_stock();


-- Trigger: Purchase order created
CREATE OR REPLACE FUNCTION trigger_webhook_po_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_webhook_delivery(
    NEW.organization_id,
    'purchase_order.created',
    NEW.id,
    jsonb_build_object(
      'purchase_order_id', NEW.id,
      'supplier_id', NEW.supplier_id,
      'total_cost', NEW.total_cost,
      'delivery_date_estimated', NEW.delivery_date_estimated,
      'timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER webhook_po_created
  AFTER INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_webhook_po_created();


-- Trigger: Purchase order status change
CREATE OR REPLACE FUNCTION trigger_webhook_po_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM create_webhook_delivery(
      NEW.organization_id,
      CASE NEW.status
        WHEN 'SENT' THEN 'purchase_order.sent'
        WHEN 'RECEIVED' THEN 'purchase_order.received'
        ELSE NULL
      END,
      NEW.id,
      jsonb_build_object(
        'purchase_order_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER webhook_po_status
  AFTER UPDATE OF status ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_webhook_po_status();


COMMENT ON TABLE webhook_endpoints IS 'Endpoints de webhook configurados por organización';
COMMENT ON TABLE webhook_deliveries IS 'Log de entregas de webhooks con reintentos';
````


---


### Backend - Webhook Dispatcher Service


`backend/src/services/webhook-dispatcher.service.ts`:
````typescript
import crypto from 'crypto';
import axios from 'axios';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';


export class WebhookDispatcherService {
  /**
   * Procesar webhooks pendientes (ejecutar en cron cada minuto)
   */
  async processQueue(): Promise {
    try {
      // Obtener deliveries pendientes o para reintentar
      const { data: deliveries } = await supabase
        .from('webhook_deliveries')
        .select(`
          *,
          webhook_endpoint:webhook_endpoints (*)
        `)
        .in('status', ['PENDING', 'RETRYING'])
        .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
        .limit(50);


      if (!deliveries || deliveries.length === 0) {
        return;
      }


      logger.info(`Processing ${deliveries.length} webhook deliveries`);


      // Procesar en paralelo (máximo 10 concurrentes)
      const chunks = this.chunk(deliveries, 10);


      for (const chunk of chunks) {
        await Promise.all(
          chunk.map((delivery) => this.sendWebhook(delivery))
        );
      }
    } catch (error) {
      logger.error('Error processing webhook queue:', error);
    }
  }


  /**
   * Enviar webhook individual
   */
  private async sendWebhook(delivery: any): Promise {
    const startTime = Date.now();
    const endpoint = delivery.webhook_endpoint;


    try {
      // 1. Generar firma HMAC
      const signature = this.generateSignature(
        delivery.payload,
        endpoint.secret_key
      );


      // 2. Preparar headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.event_type,
        'X-Webhook-Delivery-Id': delivery.id,
        'X-Webhook-Timestamp': new Date().toISOString(),
      };


      // 3. Enviar request
      const response = await axios.post(endpoint.url, delivery.payload, {
        headers,
        timeout: 30000, // 30 segundos
        validateStatus: (status) => status >= 200 && status < 300,
      });


      const responseTime = Date.now() - startTime;


      // 4. Marcar como exitoso
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'SUCCESS',
          attempts: delivery.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          response_status_code: response.status,
          response_body: JSON.stringify(response.data).slice(0, 5000),
          response_time_ms: responseTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', delivery.id);


      logger.info(`Webhook delivered successfully: ${delivery.id} (${responseTime}ms)`);
    } catch (error: any) {
      await this.handleFailure(delivery, error);
    }
  }


  /**
   * Manejar fallo de entrega
   */
  private async handleFailure(delivery: any, error: any): Promise {
    const endpoint = delivery.webhook_endpoint;
    const newAttempts = delivery.attempts + 1;
    const maxRetries = endpoint.max_retries || 3;


    let status: 'FAILED' | 'RETRYING' = 'FAILED';
    let nextRetryAt: Date | null = null;


    if (newAttempts < maxRetries) {
      status = 'RETRYING';
      // Backoff exponencial: 1min, 5min, 15min
      const backoffMinutes = Math.pow(2, newAttempts) * (endpoint.retry_backoff_seconds / 60);
      nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
    }


    const errorMessage = error.response
      ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
      : error.message;


    await supabase
      .from('webhook_deliveries')
      .update({
        status,
        attempts: newAttempts,
        last_attempt_at: new Date().toISOString(),
        next_retry_at: nextRetryAt?.toISOString() || null,
        response_status_code: error.response?.status || null,
        error_message: errorMessage.slice(0, 1000),
        completed_at: status === 'FAILED' ? new Date().toISOString() : null,
      })
      .eq('id', delivery.id);


    logger.warn(
      `Webhook delivery failed: ${delivery.id} (attempt ${newAttempts}/${maxRetries})`
    );
  }


  /**
   * Generar firma HMAC-SHA256
   */
  private generateSignature(payload: any, secret: string): string {
    const payloadStr = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadStr)
      .digest('hex');
  }


  /**
   * Verificar firma de webhook (para testing)
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }


  /**
   * Helper: dividir array en chunks
   */
  private chunk(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }


  /**
   * Enviar webhook manual (para testing)
   */
  async sendTestWebhook(
    webhookEndpointId: string,
    testPayload?: any
  ): Promise {
    try {
      const { data: endpoint } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('id', webhookEndpointId)
        .single();


      if (!endpoint) {
        throw new Error('Webhook endpoint not found');
      }


      const payload = testPayload || {
        event: 'test.webhook',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook',
        },
      };


      // Crear delivery de prueba
      const { data: delivery } = await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_endpoint_id: webhookEndpointId,
          event_type: 'notification.created', // Evento genérico
          payload,
          status: 'PENDING',
        })
        .select()
        .single();


      if (!delivery) {
        throw new Error('Failed to create test delivery');
      }


      // Enviar inmediatamente
      await this.sendWebhook({
        ...delivery,
        webhook_endpoint: endpoint,
      });


      return {
        success: true,
        message: 'Test webhook sent successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
````


---


### Backend - Cron Job Setup


`backend/src/workers/webhook-worker.ts`:
````typescript
import cron from 'node-cron';
import { WebhookDispatcherService } from '@/services/webhook-dispatcher.service';
import { logger } from '@/utils/logger';


export function startWebhookWorker(): void {
  const dispatcher = new WebhookDispatcherService();


  // Ejecutar cada minuto
  cron.schedule('* * * * *', async () => {
    try {
      await dispatcher.processQueue();
    } catch (error) {
      logger.error('Webhook worker error:', error);
    }
  });


  logger.info('Webhook worker started (running every minute)');
}
````


`backend/src/index.ts` (añadir):
````typescript
import { startWebhookWorker } from './workers/webhook-worker';


// ... código existente ...


// Iniciar worker de webhooks
if (process.env.NODE_ENV === 'production') {
  startWebhookWorker();
}
````


---


### Backend - Controller


`backend/src/controllers/webhooks.controller.ts`:
````typescript
import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';
import { WebhookDispatcherService } from '@/services/webhook-dispatcher.service';
import crypto from 'crypto';


export class WebhooksController {
  async getAll(req: AuthRequest, res: Response): Promise {
    try {
      const orgIds = req.user!.organizationIds;


      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .in('organization_id', orgIds)
        .order('created_at', { ascending: false });


      if (error) throw error;


      res.json({ data });
    } catch (error) {
      logger.error('Error fetching webhooks:', error);
      res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
  }


  async create(req: AuthRequest, res: Response): Promise {
    try {
      const { url, description, events } = req.body;
      const organizationId = req.user!.organizationIds[0];


      // Generar secret key
      const secretKey = crypto.randomBytes(32).toString('hex');


      const { data, error } = await supabase
        .from('webhook_endpoints')
        .insert({
          organization_id: organizationId,
          url,
          description,
          events,
          secret_key: secretKey,
          created_by: req.user!.id,
        })
        .select()
        .single();


      if (error) throw error;


      res.status(201).json({ data });
    } catch (error) {
      logger.error('Error creating webhook:', error);
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  }


  async update(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const { url, description, events, active } = req.body;
      const orgIds = req.user!.organizationIds;


      const { data, error } = await supabase
        .from('webhook_endpoints')
        .update({ url, description, events, active })
        .eq('id', id)
        .in('organization_id', orgIds)
        .select()
        .single();


      if (error) throw error;


      res.json({ data });
    } catch (error) {
      logger.error('Error updating webhook:', error);
      res.status(500).json({ error: 'Failed to update webhook' });
    }
  }


  async delete(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', id)
        .in('organization_id', orgIds);


      if (error) throw error;


      res.json({ message: 'Webhook deleted successfully' });
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  }


  async getDeliveries(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const orgIds = req.user!.organizationIds;


      // Verificar ownership
      const { data: webhook } = await supabase
        .from('webhook_endpoints')
        .select('id')
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (!webhook) {
        throw new AppError(404, 'Webhook not found');
      }


      const offset = (Number(page) - 1) * Number(limit);


      const { data, error, count } = await supabase
        .from('webhook_deliveries')
        .select('*', { count: 'exact' })
        .eq('webhook_endpoint_id', id)
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);


      if (error) throw error;


      res.json({
        data,
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil((count || 0) / Number(limit)),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error fetching deliveries:', error);
      res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
  }


  async sendTest(req: AuthRequest, res: Response): Promise {
    try {
      const { id } = req.params;
      const orgIds = req.user!.organizationIds;


      // Verificar ownership
      const { data: webhook } = await supabase
        .from('webhook_endpoints')
        .select('id')
        .eq('id', id)
        .in('organization_id', orgIds)
        .single();


      if (!webhook) {
        throw new AppError(404, 'Webhook not found');
      }


      const dispatcher = new WebhookDispatcherService();
      const result = await dispatcher.sendTestWebhook(id);


      if (result.success) {
        res.json({ message: result.message });
      } else {
        throw new AppError(500, result.message);
      }
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error('Error sending test webhook:', error);
      res.status(500).json({ error: 'Failed to send test webhook' });
    }
  }
}
````


---


### Frontend - Webhook Management


`frontend/src/pages/Webhooks.tsx`:
````tsx
import { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { useWebhooks } from '@/hooks/useWebhooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WebhookForm } from '@/components/webhooks/WebhookForm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';


export default function Webhooks() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: webhooks, isLoading } = useWebhooks();


  const handleTestWebhook = async (webhookId: string) => {
    // TODO: Implementar
    console.log('Test webhook:', webhookId);
  };


  return (
    
      
        
          Webhooks
          
            Configura integraciones con servicios externos
          
        


        
          
            
              
              Nuevo Webhook
            
          
          
            
              Crear Webhook
            
            <WebhookForm onSuccess={() => setIsCreateOpen(false)} />
          
        
      


      {isLoading ? (
        Cargando...
      ) : (
        
          
            
              
                URL
                Descripción
                Eventos
                Estado
                Acciones
              
            
            
              {webhooks?.data?.map((webhook) => (
                
                  
                    {webhook.url}
                  
                  {webhook.description || '-'}
                  
                    
                      {webhook.events.slice(0, 3).map((event: string) => (
                        
                          {event}
                        
                      ))}
                      {webhook.events.length > 3 && (
                        
                          +{webhook.events.length - 3}
                        
                      )}
                    
                  
                  
                    
                      {webhook.active ? 'Activo' : 'Inactivo'}
                    
                  
                  
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook.id)}
                    >
                      
                    
                  
                
              ))}
            
          
        
      )}
    
  );
}
````


---


## 🔐 SPRINT 14: Sistema de Permisos Granulares


### **`
