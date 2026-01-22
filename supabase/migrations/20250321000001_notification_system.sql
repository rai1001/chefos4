-- =====================================================
-- NOTIFICATION SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Optional: null means global for organization
    type VARCHAR(50) NOT NULL, -- LOW_STOCK, NEW_PO, SYSTEM, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization isolation for notifications" ON notifications;
CREATE POLICY "Organization isolation for notifications" ON notifications FOR ALL
    USING (organization_id IN (SELECT public.user_organization_ids()));

-- =====================================================
-- AUTOMATIC TRIGGERS
-- =====================================================

-- 1. Low Stock Trigger
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_current <= NEW.stock_min AND (OLD.stock_current > OLD.stock_min OR OLD.stock_current IS NULL) THEN
        INSERT INTO notifications (organization_id, type, title, message, link)
        VALUES (
            NEW.organization_id,
            'LOW_STOCK',
            'Stock Bajo: ' || NEW.name,
            'El ingrediente ' || NEW.name || ' ha alcanzado su stock mínimo (' || NEW.stock_min || ').',
            '/ingredients?search=' || NEW.name
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_low_stock_notification ON ingredients;
CREATE TRIGGER tr_low_stock_notification
    AFTER UPDATE OF stock_current ON ingredients
    FOR EACH ROW
    EXECUTE FUNCTION notify_low_stock();

-- 2. New Purchase Order Trigger
CREATE OR REPLACE FUNCTION notify_new_po()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (organization_id, type, title, message, link)
    VALUES (
        NEW.organization_id,
        'NEW_PO',
        'Nuevo Pedido Creado',
        'Se ha generado un nuevo borrador de pedido para el proveedor ID: ' || NEW.supplier_id,
        '/purchase-orders'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_new_po_notification ON purchase_orders;
CREATE TRIGGER tr_new_po_notification
    AFTER INSERT ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_po();
