-- Allow staff profiles without linked user accounts
ALTER TABLE public.staff_profiles
    ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE public.staff_profiles
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS contact_email TEXT,
    ADD COLUMN IF NOT EXISTS staff_type TEXT NOT NULL DEFAULT 'INTERNAL'
        CHECK (staff_type IN ('INTERNAL', 'PRACTICAS', 'EXTRA'));

CREATE INDEX IF NOT EXISTS staff_profiles_type_idx
    ON public.staff_profiles (organization_id, staff_type);

-- Expand invitation roles to align with current org roles
ALTER TABLE public.user_invitations
    DROP CONSTRAINT IF EXISTS user_invitations_role_check;

ALTER TABLE public.user_invitations
    ADD CONSTRAINT user_invitations_role_check
    CHECK (role IN ('ORG_ADMIN', 'AREA_MANAGER', 'COOK', 'SERVER'));
