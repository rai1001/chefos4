
-- =====================================================
-- HR & MULTI-ORG MANAGEMENT
-- =====================================================

-- 1. User Invitations
CREATE TABLE IF NOT EXISTS public.user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ORG_ADMIN', 'CHEF', 'WAITER', 'MANAGER')),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.users(id)
);

-- 2. Employee Schedules
CREATE TABLE IF NOT EXISTS public.employee_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ NOT NULL,
    role_override TEXT, -- e.g. "Support" or specific task
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Area Director Roles (Implicitly handled by multiple entries in organization_members)
-- We add a specific role for Area Directors if needed, though ORG_ADMIN across multiple orgs works.
-- For clarity, let's update the CHECK constraint if it exists on roles.

ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_role_check 
    CHECK (role IN ('ORG_ADMIN', 'CHEF', 'WAITER', 'MANAGER', 'AREA_DIRECTOR'));

-- RLS Policies

-- User Invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations" ON public.user_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = user_invitations.organization_id
            AND user_id = auth.uid()
            AND role IN ('ORG_ADMIN', 'MANAGER', 'AREA_DIRECTOR')
        )
    );

CREATE POLICY "Anyone can view their own invitations by email" ON public.user_invitations
    FOR SELECT USING (email = (SELECT email FROM public.users WHERE id = auth.uid()));

-- Employee Schedules
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schedules in their organization" ON public.employee_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = employee_schedules.organization_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage schedules" ON public.employee_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = employee_schedules.organization_id
            AND user_id = auth.uid()
            AND role IN ('ORG_ADMIN', 'MANAGER', 'AREA_DIRECTOR')
        )
    );

-- Functions & Triggers
CREATE TRIGGER update_employee_schedules_modtime
    BEFORE UPDATE ON public.employee_schedules
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
