-- NurseBot PRO - Supabase Schema v1.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users (Staff)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'infirmiere', 'infirmiereAdmin', 'patient')),
    pin TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar TEXT,
    active BOOLEAN DEFAULT true,
    calendar_id TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: logs
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    user_name TEXT,
    user_id UUID REFERENCES public.users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: patients
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    zip_code TEXT,
    email TEXT,
    birth_date DATE,
    gender TEXT,
    nir TEXT,
    medecin_traitant TEXT,
    contact_urgence TEXT,
    care_type TEXT,
    recurrence TEXT,
    pathologies TEXT[],
    allergies TEXT[],
    protocoles TEXT,
    notes TEXT,
    is_ald BOOLEAN DEFAULT false,
    mutuelle TEXT,
    google_drive_folder_id TEXT,
    archived BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.users(id),
    assigned_nurse_ids UUID[],
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: appointments (Planning)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    nurse_id UUID REFERENCES public.users(id),
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    type TEXT CHECK (type IN ('care', 'admin', 'meeting')),
    status TEXT CHECK (status IN ('scheduled', 'done', 'cancelled')),
    notes TEXT,
    recurrent BOOLEAN DEFAULT false,
    google_calendar_event_id TEXT,
    created_by UUID REFERENCES public.users(id),
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: transmissions (Care Notes)
CREATE TABLE IF NOT EXISTS public.transmissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    from_id UUID REFERENCES public.users(id),
    from_name TEXT,
    to_id UUID REFERENCES public.users(id),
    to_name TEXT,
    text TEXT NOT NULL,
    category TEXT CHECK (category IN ('clinique', 'social', 'logistique', 'urgence')),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT CHECK (status IN ('draft', 'sent', 'received', 'closed')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES public.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    is_demo BOOLEAN DEFAULT false
);

-- Table: ordonnances (Prescriptions)
CREATE TABLE IF NOT EXISTS public.ordonnances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    prescriber_name TEXT NOT NULL,
    prescriber_rpps TEXT,
    date_prescribed DATE NOT NULL,
    date_expiry DATE,
    care_details TEXT NOT NULL,
    status TEXT CHECK (status IN ('active', 'expiring', 'expired')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: pre_invoices (Billing NGAP)
CREATE TABLE IF NOT EXISTS public.pre_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    acts JSONB DEFAULT '[]'::jsonb,
    majorations JSONB DEFAULT '[]'::jsonb,
    displacement JSONB DEFAULT '{}'::jsonb,
    total_amount NUMERIC(10, 2),
    status TEXT CHECK (status IN ('to_prepare', 'prepared', 'sent', 'paid', 'rejected')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: tasks (Cabinet Logistics)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    deadline TIMESTAMP WITH TIME ZONE,
    owner_id UUID REFERENCES public.users(id),
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('todo', 'done')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Configuration (Simplified for now)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordonnances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Policies (Allow all for rapid prototyping/testing)
CREATE POLICY "Enable all for authenticated users" ON public.users FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.patients FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.appointments FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.transmissions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.ordonnances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.pre_invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.logs FOR ALL TO authenticated USING (true);
