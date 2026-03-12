
-- Create face_data table for storing face descriptors
CREATE TABLE public.face_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  institution_id uuid NOT NULL REFERENCES public.institutions(id),
  face_descriptor jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.face_data ENABLE ROW LEVEL SECURITY;

-- RLS: Members can view face data in their institution
CREATE POLICY "Members view face data"
ON public.face_data
FOR SELECT
TO authenticated
USING (institution_id = get_user_institution_id(auth.uid()));

-- RLS: Founders/Principals/Teachers can insert face data
CREATE POLICY "Staff insert face data"
ON public.face_data
FOR INSERT
TO authenticated
WITH CHECK (
  has_role_in_institution(auth.uid(), 'FOUNDER'::app_role, institution_id)
  OR has_role_in_institution(auth.uid(), 'PRINCIPAL'::app_role, institution_id)
  OR has_role_in_institution(auth.uid(), 'TEACHER'::app_role, institution_id)
  OR user_id = auth.uid()
);

-- RLS: Founders/Principals can delete face data
CREATE POLICY "Staff delete face data"
ON public.face_data
FOR DELETE
TO authenticated
USING (
  has_role_in_institution(auth.uid(), 'FOUNDER'::app_role, institution_id)
  OR has_role_in_institution(auth.uid(), 'PRINCIPAL'::app_role, institution_id)
  OR user_id = auth.uid()
);

-- RLS: Update own face data
CREATE POLICY "Users update own face data"
ON public.face_data
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Unique constraint: one face per user
ALTER TABLE public.face_data ADD CONSTRAINT face_data_user_unique UNIQUE (user_id);

-- Enable realtime on attendance table
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
