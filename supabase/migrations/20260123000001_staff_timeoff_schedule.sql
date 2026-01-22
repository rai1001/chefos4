-- =====================================================
-- STAFF PROFILES, TIME OFF, AND KITCHEN SCHEDULES
-- =====================================================

-- Staff profiles
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
    role_in_kitchen TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_profiles_org_member_unique
    ON public.staff_profiles (organization_id, member_id);

-- Staff contracts
CREATE TABLE IF NOT EXISTS public.staff_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    weekly_hours_target NUMERIC,
    max_weekly_hours NUMERIC,
    vacation_days_per_year INTEGER,
    rest_min_hours_between_shifts INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_contracts_staff_unique
    ON public.staff_contracts (staff_id);

-- Staff time off
CREATE TABLE IF NOT EXISTS public.staff_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('VACATION', 'SICK_LEAVE', 'OTHER')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED')),
    counted_days INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    approved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_time_off_staff_idx ON public.staff_time_off (staff_id);
CREATE INDEX IF NOT EXISTS staff_time_off_status_idx ON public.staff_time_off (status);

-- Vacation balance per year
CREATE TABLE IF NOT EXISTS public.staff_vacation_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    days_allocated INTEGER DEFAULT 0,
    days_used INTEGER DEFAULT 0,
    days_remaining INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_vacation_balance_unique
    ON public.staff_vacation_balance (staff_id, year);

-- Schedule months
CREATE TABLE IF NOT EXISTS public.schedule_months (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
    created_by UUID REFERENCES public.users(id),
    published_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS schedule_months_org_month_unique
    ON public.schedule_months (organization_id, month);

-- Shift templates
CREATE TABLE IF NOT EXISTS public.shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_code TEXT NOT NULL CHECK (shift_code IN ('MORNING', 'AFTERNOON', 'NIGHT')),
    station TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Shifts
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    schedule_month_id UUID NOT NULL REFERENCES public.schedule_months(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_code TEXT NOT NULL CHECK (shift_code IN ('MORNING', 'AFTERNOON', 'NIGHT')),
    station TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
    template_id UUID REFERENCES public.shift_templates(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shifts_schedule_month_idx ON public.shifts (schedule_month_id);
CREATE INDEX IF NOT EXISTS shifts_date_idx ON public.shifts (date);

-- Shift assignments
CREATE TABLE IF NOT EXISTS public.shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'CONFIRMED', 'ABSENT')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shift_assignments_unique
    ON public.shift_assignments (shift_id, staff_id);

CREATE INDEX IF NOT EXISTS shift_assignments_staff_idx ON public.shift_assignments (staff_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_vacation_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- Staff profiles
CREATE POLICY "Staff profiles are visible to org members" ON public.staff_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = staff_profiles.organization_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage staff profiles" ON public.staff_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = staff_profiles.organization_id
              AND user_id = auth.uid()
              AND role IN ('ORG_ADMIN', 'MANAGER', 'AREA_DIRECTOR')
        )
    );

-- Staff contracts
CREATE POLICY "Staff contracts visible to org members" ON public.staff_contracts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            JOIN public.organization_members om ON om.organization_id = sp.organization_id
            WHERE sp.id = staff_contracts.staff_id
              AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage staff contracts" ON public.staff_contracts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            JOIN public.organization_members om ON om.organization_id = sp.organization_id
            WHERE sp.id = staff_contracts.staff_id
              AND om.user_id = auth.uid()
              AND om.role IN ('ORG_ADMIN', 'MANAGER', 'AREA_DIRECTOR')
        )
    );

-- Staff time off
CREATE POLICY "Time off visible to org members" ON public.staff_time_off
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            JOIN public.organization_members om ON om.organization_id = sp.organization_id
            WHERE sp.id = staff_time_off.staff_id
              AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can request time off" ON public.staff_time_off
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            JOIN public.organization_members om ON om.organization_id = sp.organization_id
            WHERE sp.id = staff_time_off.staff_id
              AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage time off" ON public.staff_time_off
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            JOIN public.organization_members om ON om.organization_id = sp.organization_id
            WHERE sp.id = staff_time_off.staff_id
              AND om.user_id = auth.uid()
              AND om.role IN ('ORG_ADMIN', 'MANAGER', 'AREA_DIRECTOR')
        )
    );

-- Vacation balance
CREATE POLICY "Vacation balance visible to org members" ON public.staff_vacation_balance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            JOIN public.organization_members om ON om.organization_id = sp.organization_id
            WHERE sp.id = staff_vacation_balance.staff_id
              AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage vacation balance" ON public.staff_vacation_balance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            JOIN public.organization_members om ON om.organization_id = sp.organization_id
            WHERE sp.id = staff_vacation_balance.staff_id
              AND om.user_id = auth.uid()
              AND om.role IN ('ORG_ADMIN', 'MANAGER', 'AREA_DIRECTOR')
        )
    );

-- Schedule months, shifts, templates
CREATE POLICY "Schedule data visible to org members" ON public.schedule_months
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = schedule_months.organization_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage schedule months" ON public.schedule_months
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = schedule_months.organization_id
              AND user_id = auth.uid()
              AND role IN ('ORG_ADMIN', 'MANAGER', 'AREA_DIRECTOR')
        )
    );

CREATE POLICY "Shift templates visible to org members" ON public.shift_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = shift_templates.organization_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage shift templates" ON public.shift_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = shift_templates.organization_id
              AND user_id = auth.uid()
              AND role IN ('ORG_ADMIN', 'MANAGER', 'AREA_DIRECTOR')
        )
    );

CREATE POLICY "Shifts visible to org members" ON public.shifts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = shifts.organization_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage shifts" ON public.shifts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = shifts.organization_id
              AND user_id = auth.uid()
              AND role IN ('ORG_ADMIN', 'MANAGER', 'AREA_DIRECTOR')
        )
    );

CREATE POLICY "Shift assignments visible to org members" ON public.shift_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            JOIN public.organization_members om ON om.organization_id = sp.organization_id
            WHERE sp.id = shift_assignments.staff_id
              AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage shift assignments" ON public.shift_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            JOIN public.organization_members om ON om.organization_id = sp.organization_id
            WHERE sp.id = shift_assignments.staff_id
              AND om.user_id = auth.uid()
              AND om.role IN ('ORG_ADMIN', 'MANAGER', 'AREA_DIRECTOR')
        )
    );
