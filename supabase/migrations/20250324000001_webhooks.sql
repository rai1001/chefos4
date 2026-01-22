
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_code INTEGER,
    response_body TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhooks_org_id ON public.webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status);

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhooks
CREATE POLICY "Users can view webhooks of their organization"
    ON public.webhooks
    FOR SELECT
    USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Users can insert webhooks for their organization"
    ON public.webhooks
    FOR INSERT
    WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Users can update webhooks of their organization"
    ON public.webhooks
    FOR UPDATE
    USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Users can delete webhooks of their organization"
    ON public.webhooks
    FOR DELETE
    USING (organization_id IN (SELECT public.user_organization_ids()));

-- RLS Policies for webhook_deliveries
-- Deliveries are mostly system-generated, but users might want to view history
CREATE POLICY "Users can view webhook deliveries of their organization"
    ON public.webhook_deliveries
    FOR SELECT
    USING (webhook_id IN (
        SELECT id FROM public.webhooks WHERE organization_id IN (SELECT public.user_organization_ids())
    ));

-- Triggers to update updated_at
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON public.webhooks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
