# SPRINT 08: Sistema de Notificaciones Push 🔔


**Objetivo:** Implementar sistema de notificaciones en tiempo real para alertas de stock, órdenes pendientes, etc.


---


### Migración: Notifications Table


`supabase/migrations/20250215000001_notifications.sql`:
```sql
CREATE TYPE notification_type AS ENUM (
  'LOW_STOCK',
  'CUTOFF_WARNING',
  'ORDER_RECEIVED',
  'ORDER_LATE',
  'EVENT_REMINDER',
  'SYSTEM'
);


CREATE TYPE notification_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');


CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE, -- NULL = all users
  
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'MEDIUM',
  
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Metadata adicional (JSON)
  data JSONB DEFAULT '{}',
  
  -- URL para acción
  action_url VARCHAR(500) NULL,
  
  -- Estado
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL,
  
  -- Índices
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at)
);


CREATE INDEX idx_notifications_user ON notifications(user_id, read) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_org ON notifications(organization_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority, read);


-- Función: Crear notificación de stock bajo
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_current <= NEW.stock_min AND OLD.stock_current > OLD.stock_min THEN
    INSERT INTO notifications (
      organization_id,
      type,
      priority,
      title,
      message,
      data,
      action_url
    ) VALUES (
      NEW.organization_id,
      'LOW_STOCK',
      'HIGH',
      'Stock bajo: ' || NEW.name,
      'El ingrediente "' || NEW.name || '" tiene stock bajo el mínimo (' || NEW.stock_current || ' ' || (SELECT abbreviation FROM units WHERE id = NEW.unit_id) || ')',
      jsonb_build_object('ingredient_id', NEW.id, 'current_stock', NEW.stock_current, 'min_stock', NEW.stock_min),
      '/ingredients/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_low_stock_notification
  AFTER UPDATE OF stock_current ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();


COMMENT ON TRIGGER trigger_low_stock_notification ON ingredients IS 'Crea notificación cuando stock baja del mínimo';
```


---


### Backend - Notification Service


`backend/src/services/notification.service.ts`:
```typescript
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';


export class NotificationService {
  /**
   * Crear notificación
   */
  async create(params: {
    organizationId: string;
    userId?: string;
    type: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    title: string;
    message: string;
    data?: any;
    actionUrl?: string;
    expiresAt?: Date;
  }): Promise {
    const { error } = await supabase.from('notifications').insert({
      organization_id: params.organizationId,
      user_id: params.userId || null,
      type: params.type,
      priority: params.priority,
      title: params.title,
      message: params.message,
      data: params.data || {},
      action_url: params.actionUrl,
      expires_at: params.expiresAt?.toISOString(),
    });


    if (error) {
      logger.error('Error creating notification:', error);
    }
  }


  /**
   * Marcar como leída
   */
  async markAsRead(notificationId: string, userId: string): Promise {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);
  }


  /**
   * Marcar todas como leídas
   */
  async markAllAsRead(userId: string): Promise {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);
  }


  /**
   * Limpiar notificaciones expiradas
   */
  async cleanExpired(): Promise {
    await supabase
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString());
  }
}
```


---


### Frontend - Notification Bell


`frontend/src/components/layout/NotificationBell.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';


export function NotificationBell() {
  const { data: notifications, refetch } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.read).length || 0;


  // Polling cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);


    return () => clearInterval(interval);
  }, [refetch]);


  return (
    
      
        
          
          {unreadCount > 0 && (
            
              {unreadCount > 9 ? '9+' : unreadCount}
            
          )}
        
      
      
        
          Notificaciones
          {notifications && notifications.length > 0 ? (
            
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-lg border p-3 ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                >
                  {notification.title}
                  
                    {notification.message}
                  
                  
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  
                
              ))}
            
          ) : (
            
              No hay notificaciones
            
          )}
        
      
    
  );
}
```


---


## 🎯 RESUMEN MVP 2.0 - 10 NUEVAS FEATURES


1. ✅ **Analytics Dashboard** - KPIs, gráficos, tendencias
2. ✅ **Notificaciones Push** - Alertas en tiempo real
3. 🔄 **OCR Recepción** - Escaneo de albaranes
4. 🔄 **Planificación Gantt** - Timeline de producción
5. 🔄 **Sistema de Auditoría** - Logs de cambios
6. 🔄 **Exportación PDF/Excel** - Reportes descargables
7. 🔄 **Gestión de Mermas** - Causas y análisis
8. 🔄 **Webhooks** - Integraciones con terceros
9. 🔄 **Permisos Granulares** - Control de acceso avanzado
10. 🔄 **Modo Offline** - PWA con sincronización


---


¿Quieres que desarrolle en detalle alguna de las features restantes (3-10)?3  4 6 7 8 90:462 / 2🚀 MVP 2.0 - FEATURES 3, 4, 6, 7, 8, 9 DETALLADAS


📸 SPRINT 09: OCR para Recepción de Albaranes
