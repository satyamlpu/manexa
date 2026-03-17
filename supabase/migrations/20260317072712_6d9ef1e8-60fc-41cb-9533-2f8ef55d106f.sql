
-- Recreate the trigger that was missing
DROP TRIGGER IF EXISTS trg_set_institution_credentials ON public.institutions;
CREATE TRIGGER trg_set_institution_credentials
  BEFORE INSERT ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_institution_credentials();

-- Also add UPDATE RLS policy for attendance (needed for manual attendance edits)
CREATE POLICY "Teachers/Principals update attendance"
  ON public.attendance
  FOR UPDATE
  TO authenticated
  USING (
    has_role_in_institution(auth.uid(), 'TEACHER'::app_role, institution_id)
    OR has_role_in_institution(auth.uid(), 'PRINCIPAL'::app_role, institution_id)
    OR has_role_in_institution(auth.uid(), 'FOUNDER'::app_role, institution_id)
  );
