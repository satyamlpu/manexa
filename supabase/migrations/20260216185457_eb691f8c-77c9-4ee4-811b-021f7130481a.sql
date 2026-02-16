
-- Add PARENT to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'PARENT';

-- Create fees table
CREATE TABLE public.fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_date DATE,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMP WITH TIME ZONE,
  receipt_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view fees" ON public.fees FOR SELECT
  USING (institution_id = get_user_institution_id(auth.uid()));

CREATE POLICY "Founders/Principals manage fees" ON public.fees FOR ALL
  USING (has_role_in_institution(auth.uid(), 'FOUNDER'::app_role, institution_id)
    OR has_role_in_institution(auth.uid(), 'PRINCIPAL'::app_role, institution_id));

CREATE TRIGGER update_fees_updated_at BEFORE UPDATE ON public.fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create teacher_salaries table
CREATE TABLE public.teacher_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  base_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(10,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view salaries" ON public.teacher_salaries FOR SELECT
  USING (institution_id = get_user_institution_id(auth.uid()));

CREATE POLICY "Founders manage salaries" ON public.teacher_salaries FOR ALL
  USING (has_role_in_institution(auth.uid(), 'FOUNDER'::app_role, institution_id));

CREATE TRIGGER update_salaries_updated_at BEFORE UPDATE ON public.teacher_salaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add parent_user_id to students table for parent linking
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_user_id UUID;

-- Add section to students if not exists (for section allocation)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS section TEXT;
