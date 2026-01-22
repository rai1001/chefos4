-- Fix recursive RLS on organization_members by using SECURITY DEFINER helpers.

CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.user_admin_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid() AND role = 'ORG_ADMIN'
$$;

REVOKE ALL ON FUNCTION public.user_organization_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_admin_organization_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_admin_organization_ids() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Org admins can manage members" ON public.organization_members;
CREATE POLICY "Org admins can manage members"
  ON public.organization_members
  FOR ALL
  USING (organization_id IN (SELECT public.user_admin_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_admin_organization_ids()));
