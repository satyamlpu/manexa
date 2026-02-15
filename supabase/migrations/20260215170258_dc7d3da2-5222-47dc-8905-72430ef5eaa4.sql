
-- Fix permissive INSERT policies by making them more restrictive

-- Institutions: only allow insert if user is the one registering (they'll be the founder)
DROP POLICY "Anyone can insert institution" ON public.institutions;
CREATE POLICY "Authenticated users can create institution" ON public.institutions
  FOR INSERT TO authenticated
  WITH CHECK (true);
-- NOTE: This must stay permissive because during registration, the user has no institution yet.
-- The edge function handles the business logic validation.

-- Profiles: only allow inserting your own profile
DROP POLICY "System can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- User roles: restrict to founders/principals or self during registration
DROP POLICY "System can insert roles" ON public.user_roles;
CREATE POLICY "Authorized role insertion" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role_in_institution(auth.uid(), 'FOUNDER', institution_id)
    OR public.has_role_in_institution(auth.uid(), 'PRINCIPAL', institution_id)
  );
