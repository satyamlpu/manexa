
-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('SUPER_ADMIN', 'FOUNDER', 'PRINCIPAL', 'TEACHER', 'STUDENT');

-- 2. Institutions table
CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  subscription_plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- 3. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role, institution_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  class_name TEXT NOT NULL,
  section TEXT,
  class_teacher_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 6. Teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  department TEXT,
  qualification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- 7. Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  class_id UUID REFERENCES public.classes(id),
  roll_number TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 8. Attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late')),
  marked_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 9. Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 10. Announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  posted_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 11. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_institution(_user_id UUID, _role app_role, _institution_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role AND institution_id = _institution_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_institution_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT institution_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 13. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. RLS Policies

-- Institutions: members can view their own institution
CREATE POLICY "Members can view own institution" ON public.institutions
  FOR SELECT TO authenticated
  USING (id = public.get_user_institution_id(auth.uid()));

CREATE POLICY "Founders can update own institution" ON public.institutions
  FOR UPDATE TO authenticated
  USING (public.has_role_in_institution(auth.uid(), 'FOUNDER', id));

CREATE POLICY "Anyone can insert institution" ON public.institutions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Profiles: members see same institution
CREATE POLICY "Members view same institution profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (institution_id = public.get_user_institution_id(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Founders can manage roles in institution" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role_in_institution(auth.uid(), 'FOUNDER', institution_id));

CREATE POLICY "Principals can manage roles in institution" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role_in_institution(auth.uid(), 'PRINCIPAL', institution_id));

CREATE POLICY "System can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (true);

-- Classes
CREATE POLICY "Members view classes" ON public.classes
  FOR SELECT TO authenticated
  USING (institution_id = public.get_user_institution_id(auth.uid()));

CREATE POLICY "Founders/Principals manage classes" ON public.classes
  FOR ALL TO authenticated
  USING (
    public.has_role_in_institution(auth.uid(), 'FOUNDER', institution_id)
    OR public.has_role_in_institution(auth.uid(), 'PRINCIPAL', institution_id)
  );

-- Teachers
CREATE POLICY "Members view teachers" ON public.teachers
  FOR SELECT TO authenticated
  USING (institution_id = public.get_user_institution_id(auth.uid()));

CREATE POLICY "Founders/Principals manage teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (
    public.has_role_in_institution(auth.uid(), 'FOUNDER', institution_id)
    OR public.has_role_in_institution(auth.uid(), 'PRINCIPAL', institution_id)
  );

-- Students
CREATE POLICY "Members view students" ON public.students
  FOR SELECT TO authenticated
  USING (institution_id = public.get_user_institution_id(auth.uid()));

CREATE POLICY "Founders/Principals/Teachers manage students" ON public.students
  FOR ALL TO authenticated
  USING (
    public.has_role_in_institution(auth.uid(), 'FOUNDER', institution_id)
    OR public.has_role_in_institution(auth.uid(), 'PRINCIPAL', institution_id)
    OR public.has_role_in_institution(auth.uid(), 'TEACHER', institution_id)
  );

-- Attendance
CREATE POLICY "Members view attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (institution_id = public.get_user_institution_id(auth.uid()));

CREATE POLICY "Teachers/Principals mark attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_in_institution(auth.uid(), 'TEACHER', institution_id)
    OR public.has_role_in_institution(auth.uid(), 'PRINCIPAL', institution_id)
    OR public.has_role_in_institution(auth.uid(), 'FOUNDER', institution_id)
  );

-- Tasks
CREATE POLICY "Members view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (institution_id = public.get_user_institution_id(auth.uid()));

CREATE POLICY "Teachers+ manage tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (
    public.has_role_in_institution(auth.uid(), 'TEACHER', institution_id)
    OR public.has_role_in_institution(auth.uid(), 'PRINCIPAL', institution_id)
    OR public.has_role_in_institution(auth.uid(), 'FOUNDER', institution_id)
  );

-- Announcements
CREATE POLICY "Members view announcements" ON public.announcements
  FOR SELECT TO authenticated
  USING (institution_id = public.get_user_institution_id(auth.uid()));

CREATE POLICY "Principals+ manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (
    public.has_role_in_institution(auth.uid(), 'PRINCIPAL', institution_id)
    OR public.has_role_in_institution(auth.uid(), 'FOUNDER', institution_id)
  );
