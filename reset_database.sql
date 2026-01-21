-- 🚨 ATTENTION : CE VIDEO VA TOUT EFFACER ET RECRÉER LA BASE DE DONNÉES 🚨

-- 1. DROP EXISTING TABLES (CASCADE)
DROP TABLE IF EXISTS public.transmissions CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.ordonnances CASCADE;
DROP TABLE IF EXISTS public.pre_invoices CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;

-- 2. CREATE TABLE USERS
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL, 
    phone TEXT,
    email TEXT,
    avatar TEXT,
    pin TEXT NOT NULL DEFAULT '1234',
    active BOOLEAN DEFAULT true,
    calendar_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CREATE TABLE PATIENTS
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    care_type TEXT, -- typeSoin
    recurrence TEXT,
    pathologies TEXT[], -- Array of strings
    allergies TEXT[],   -- Array of strings
    protocoles TEXT,
    notes TEXT,
    is_ald BOOLEAN DEFAULT false,
    mutuelle TEXT,
    google_drive_folder_id TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    archived BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.users(id),
    assigned_nurse_ids TEXT[], -- Array of UUIDs
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CREATE TABLE APPOINTMENTS
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    nurse_id UUID REFERENCES public.users(id),
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    type TEXT NOT NULL, -- care, admin, meeting
    status TEXT DEFAULT 'scheduled', -- scheduled, done, cancelled
    notes TEXT,
    recurrent BOOLEAN DEFAULT false,
    google_calendar_event_id TEXT,
    created_by UUID REFERENCES public.users(id),
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CREATE TABLE TRANSMISSIONS
CREATE TABLE public.transmissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    from_id UUID REFERENCES public.users(id),
    from_name TEXT,
    to_id UUID REFERENCES public.users(id),
    to_name TEXT,
    text TEXT NOT NULL,
    category TEXT NOT NULL, -- clinique, social, logistique, urgence
    priority TEXT DEFAULT 'medium', -- low, medium, high
    status TEXT DEFAULT 'sent', -- draft, sent, received, closed
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES public.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    is_demo BOOLEAN DEFAULT false
);

-- 6. CREATE TABLE ORDONNANCES
CREATE TABLE public.ordonnances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    prescriber_name TEXT,
    prescriber_rpps TEXT,
    date_prescribed DATE,
    date_expiry DATE,
    care_details TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. CREATE TABLE TASKS
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    deadline TIMESTAMP WITH TIME ZONE,
    owner_id UUID REFERENCES public.users(id),
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'todo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. CREATE TABLE PRE_INVOICES
CREATE TABLE public.pre_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    acts JSONB NOT NULL,
    majorations JSONB,
    displacement JSONB,
    total_amount NUMERIC,
    status TEXT DEFAULT 'to_prepare',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. CREATE TABLE MESSAGES
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    direction TEXT NOT NULL, -- inbound, outbound
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'sent'
);

-- 10. SETUP ROW LEVEL SECURITY (RLS) - PUBLIC ACCESS FOR NOW
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordonnances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated access
CREATE POLICY "Auth Access Users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth Access Patients" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth Access Appointments" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth Access Transmissions" ON public.transmissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth Access Ordonnances" ON public.ordonnances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth Access Tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth Access PreInvoices" ON public.pre_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth Access Messages" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. INSERT DEFAULT USERS
INSERT INTO public.users (id, first_name, last_name, role, pin, active, phone)
VALUES 
('a0000001-0000-0000-0000-000000000001', 'Alice', 'Martin', 'admin', '1234', true, '0601010101'),
('a0000002-0000-0000-0000-000000000002', 'Bertrand', 'Durand', 'infirmiere', '1234', true, '0602020202'),
('a0000003-0000-0000-0000-000000000003', 'Carine', 'Lefebvre', 'infirmiereAdmin', '1234', true, '0603030303');
