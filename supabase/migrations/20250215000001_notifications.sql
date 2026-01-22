
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'LOW_STOCK',
    'CUTOFF_WARNING',
    'ORDER_RECEIVED',
    'ORDER_LATE',
    'EVENT_REMINDER',
    'SYSTEM'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES public.users(id) ON DELETE CASCADE, -- NULL = all users
  
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

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS priority notification_priority DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS type notification_type;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(organization_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority, read);

-- Función: Crear notificación de stock bajo
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_current <= NEW.stock_min AND OLD.stock_current > OLD.stock_min THEN
    INSERT INTO public.notifications (
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
      'El ingrediente "' || NEW.name || '" tiene stock bajo el mínimo (' || NEW.stock_current || ')',
      jsonb_build_object('ingredient_id', NEW.id, 'current_stock', NEW.stock_current, 'min_stock', NEW.stock_min),
      '/ingredients/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_low_stock_notification ON public.ingredients;
CREATE TRIGGER trigger_low_stock_notification
  AFTER UPDATE OF stock_current ON public.ingredients
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();

COMMENT ON TRIGGER trigger_low_stock_notification ON public.ingredients IS 'Crea notificación cuando stock baja del mínimo';
