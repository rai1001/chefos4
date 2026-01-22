-- =====================================================
-- DELIVERY NOTES & OCR RECONCILIATION
-- =====================================================

CREATE TABLE delivery_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, RECONCILED, DISCREPANCY
    total_amount DECIMAL(12,2),
    image_url TEXT,
    extracted_data JSONB, -- Storage for vision API raw output
    reconciliation_results JSONB, -- Discrepancies found
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reconciled_at TIMESTAMPTZ
);

-- Indices
CREATE INDEX idx_delivery_notes_org ON delivery_notes(organization_id);
CREATE INDEX idx_delivery_notes_po ON delivery_notes(purchase_order_id);

-- RLS
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization isolation for delivery_notes" ON delivery_notes FOR ALL
    USING (organization_id IN (SELECT public.user_organization_ids()));

-- =====================================================
-- RECONCILIATION LOGIC
-- =====================================================

CREATE OR REPLACE FUNCTION reconcile_delivery_note(p_delivery_note_id UUID)
RETURNS void AS $$
DECLARE
    v_po_id UUID;
    v_discrepancies JSONB := '[]';
BEGIN
    -- 1. Get PO link
    SELECT purchase_order_id INTO v_po_id 
    FROM delivery_notes 
    WHERE id = p_delivery_note_id;

    IF v_po_id IS NULL THEN
        RETURN;
    END IF;

    -- 2. Basic reconciliation logic would go here:
    -- In a real scenario, this would compare line items.
    -- For now, we update the status to PENDING_REVIEW 
    -- and let the user confirm in the UI.

    UPDATE delivery_notes 
    SET status = 'PENDING_REVIEW' 
    WHERE id = p_delivery_note_id;
END;
$$ LANGUAGE plpgsql;
