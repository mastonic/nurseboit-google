
import { Patient, Appointment, Prescription, PreInvoice, UserSession, Transmission, Task, User, Settings } from '../types';
import { createClient } from '@supabase/supabase-js';

// Helper to convert snake_case (DB) to camelCase (App)
const toCamel = (obj: any): any => {
  if (!obj || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  return Object.keys(obj).reduce((acc: any, key) => {
    // Handle special case is_ald -> isALD
    let camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (camelKey === 'isAld') camelKey = 'isALD';
    acc[camelKey] = toCamel(obj[key]);
    return acc;
  }, {});
};

// Helper to convert camelCase (App) to snake_case (DB)
const toSnake = (obj: any): any => {
  if (!obj || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);

  const result = Object.keys(obj).reduce((acc: any, key) => {
    // Handle special case isALD -> is_ald
    let snakeKey = key === 'isALD' ? 'is_ald' : key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    acc[snakeKey] = toSnake(obj[key]);

    // SPECIAL: Duplicate firstName/lastName as prenom/nom for French DB columns
    if (key === 'firstName') acc['prenom'] = obj[key];
    if (key === 'lastName') acc['nom'] = obj[key];

    return acc;
  }, {});

  return result;
};

const SESSION_KEY = 'nursebot_session';
const OFFLINE_DATA_KEY = 'nursebot_offline_data';
const UPDATE_EVENT = 'nursebot-store-update';

const MOCK_NURSES: User[] = [
  { id: 'u1', firstName: 'Alice', lastName: 'Martin', role: 'admin', pin: '1234', active: true, phone: '0601010101' },
  { id: 'u2', firstName: 'Bertrand', lastName: 'Durand', role: 'infirmiere', pin: '1234', active: true, phone: '0602020202' },
  { id: 'u3', firstName: 'Carine', lastName: 'Lefebvre', role: 'infirmiereAdmin', pin: '1234', active: true, phone: '0603030303' }
];

const DEMO_PATIENTS: Patient[] = [
  {
    id: 'demo-p1',
    firstName: 'Marie',
    lastName: 'Lefebvre',
    phone: '0612345678',
    address: '24 Rue des Lilas, 75020 Paris',
    careType: 'Pansement V.A.C (Malléole)',
    recurrence: 'Quotidien',
    notes: 'Diabétique de type 2. Surveiller l\'aspect de la plaie (oedème ++). Code porte: 1234A.',
    isALD: true,
    allergies: ['Pénicilline'],
    pathologies: ['Diabète', 'HTA'],
    createdBy: 'u1',
    isDemo: true,
    assignedNurseIds: ['u1', 'u2']
  },
  {
    id: 'demo-p2',
    firstName: 'Jean',
    lastName: 'Petit',
    phone: '0788990011',
    address: '12 Avenue Gambetta, 75020 Paris',
    careType: 'Insuline + Surveillance',
    recurrence: '3x par jour',
    notes: 'Patient souvent désorienté le matin. Risque de chute.',
    isALD: true,
    pathologies: ['Alzheimer débutant'],
    createdBy: 'u1',
    isDemo: true,
    assignedNurseIds: ['u1', 'u3']
  }
];

const today = new Date().toISOString().split('T')[0];

const DEMO_APPOINTMENTS: Appointment[] = [
  { id: 'da1', patientId: 'demo-p1', nurseId: 'u1', dateTime: `${today}T08:00:00`, durationMinutes: 30, type: 'care', status: 'done', isDemo: true },
  { id: 'da2', patientId: 'demo-p2', nurseId: 'u1', dateTime: `${today}T08:45:00`, durationMinutes: 20, type: 'care', status: 'scheduled', isDemo: true },
  { id: 'da3', patientId: 'demo-p1', nurseId: 'u2', dateTime: `${today}T18:00:00`, durationMinutes: 30, type: 'care', status: 'scheduled', isDemo: true }
];

const DEMO_TRANSMISSIONS: Transmission[] = [
  {
    id: 'dt1',
    patientId: 'demo-p1',
    fromId: 'u2',
    fromName: 'Bertrand Durand',
    text: "OBSERVATIONS: Plaie propre, bourgeonnement satisfaisant.\nVIGILANCE: Risque de macération si chaleur excessive.\nACTION À FAIRE: Vérifier le code de l'ascenseur.",
    category: 'clinique',
    priority: 'medium',
    status: 'sent',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isDemo: true
  },
  {
    id: 'dt2',
    patientId: 'demo-p2',
    fromId: 'u1',
    fromName: 'Alice Martin',
    text: "OBSERVATIONS: Glycémie à 2.1g ce matin.\nVIGILANCE: Patient semble très confus.\nACTION À FAIRE: Appeler la famille.",
    category: 'urgence',
    priority: 'high',
    status: 'received',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    isDemo: true
  }
];

let state: any = {
  dbStatus: 'loading',
  dbError: null,
  patients: [],
  appointments: [],
  externalEvents: [],
  prescriptions: [],
  transmissions: [],
  chatMessages: [],
  internalMessages: [],
  invoices: [],
  users: [],
  tasks: [],
  messages: [],
  alerts: [],
  logs: [],
  settings: {
    cabinetName: 'Cabinet Infirmier Pro',
    workingHoursStart: '06:00',
    workingHoursEnd: '21:00',
    defaultCareDuration: 20,
    apiConfig: {
      twilioSid: '',
      twilioToken: '',
      twilioPhone: '',
      whatsappPhone: '',
      twilioWebhookUrl: '',
      n8nApiKey: '',
      n8nBaseUrl: '',
      supabaseUrl: '',
      supabaseKey: '',
      resendKey: '',
      googleCalendarSync: false
    }
  }
};

export const getSupabaseClient = () => {
  const url = state.settings.apiConfig.supabaseUrl || process.env.VITE_SUPABASE_URL || '';
  const key = state.settings.apiConfig.supabaseKey || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key || url.includes('YOUR_')) return null;
  try { return createClient(url, key); } catch (e) { return null; }
};

export const initStore = async () => {
  loadLocalData();
  const supabase = getSupabaseClient();
  if (!supabase) {
    state.dbStatus = 'local';
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    return;
  }
  try {
    state.dbStatus = 'loading';
    const [uRes, pRes, aRes, tRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('patients').select('*'),
      supabase.from('appointments').select('*'),
      supabase.from('transmissions').select('*').order('timestamp', { ascending: false })
    ]);

    if (uRes.error) throw uRes.error;
    if (pRes.error) throw pRes.error;
    if (aRes.error) throw aRes.error;
    if (tRes.error) throw tRes.error;

    const users = toCamel(uRes.data || []);
    const patients = toCamel(pRes.data || []);
    const appointments = toCamel(aRes.data || []);
    const transmissions = toCamel(tRes.data || []);

    state = {
      ...state,
      dbStatus: 'connected',
      users: users.length ? users : state.users,
      patients: patients.length ? patients : state.patients,
      appointments: appointments.length ? appointments : state.appointments,
      transmissions: transmissions.length ? transmissions : state.transmissions
    };
    saveOffline();
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch (error: any) {
    state.dbStatus = 'error';
    state.dbError = error.message;
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  }
};

const loadLocalData = () => {
  const localData = localStorage.getItem(OFFLINE_DATA_KEY);
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      state = { ...state, ...parsed };
    } catch (e) { console.error("Erreur lecture", e); }
  } else {
    state.users = MOCK_NURSES;
    state.patients = DEMO_PATIENTS;
    state.appointments = DEMO_APPOINTMENTS;
    state.transmissions = DEMO_TRANSMISSIONS;
    saveOffline();
  }
};

const saveOffline = () => { localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(state)); };

export const getStore = () => state;
export const subscribeToStore = (callback: () => void) => {
  window.addEventListener(UPDATE_EVENT, callback);
  return () => window.removeEventListener(UPDATE_EVENT, callback);
};

export const updateSettings = (settingsUpdate: Partial<Settings>) => {
  state.settings = { ...state.settings, ...settingsUpdate, apiConfig: { ...state.settings.apiConfig, ...(settingsUpdate.apiConfig || {}) } };
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const getCurrentSession = (): UserSession | null => {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

export const login = (userId: string, pin: string): boolean => {
  const user = state.users.find((u: any) => u.id === userId && u.pin === pin);
  if (user) {
    const session: UserSession = {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      loginAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    return true;
  }
  return false;
};

export const logout = () => { localStorage.removeItem(SESSION_KEY); window.dispatchEvent(new CustomEvent(UPDATE_EVENT)); };

export const addLog = (action: string, userId: string = 'system') => {
  const user = getCurrentSession();
  state.logs = [{ id: Date.now().toString(), action, user: user?.name || 'Système', timestamp: new Date().toISOString() }, ...state.logs.slice(0, 49)];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updatePatient = async (patient: Patient) => {
  state.patients = state.patients.map((p: any) => p.id === patient.id ? patient : p);
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('patients').upsert(toSnake(patient));
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addTransmission = async (trans: Transmission) => {
  state.transmissions = [trans, ...state.transmissions];
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('transmissions').insert(toSnake(trans));
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const saveStore = (newState: Partial<any>) => {
  state = { ...state, ...newState };
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateAppointment = async (apt: Appointment) => {
  state.appointments = state.appointments.map((a: any) => a.id === apt.id ? apt : a);
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('appointments').upsert(toSnake(apt));
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const markTransmissionReceived = async (transId: string, userId: string) => {
  const acknowledgedAt = new Date().toISOString();
  state.transmissions = state.transmissions.map((t: Transmission) =>
    t.id === transId ? { ...t, status: 'closed', acknowledgedBy: userId, acknowledgedAt } : t
  );
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('transmissions').update({ status: 'closed', acknowledged_by: userId, acknowledged_at: acknowledgedAt }).eq('id', transId);
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addInternalMessage = (msg: any) => {
  state.internalMessages = [...(state.internalMessages || []), msg];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const upsertUser = async (user: User) => {
  const exists = state.users.some((u: User) => u.id === user.id);
  state.users = exists ? state.users.map((u: User) => u.id === user.id ? user : u) : [...state.users, user];
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('users').upsert(toSnake(user));
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

// Fix for missing setExternalEvents
export const setExternalEvents = (events: any[]) => {
  state.externalEvents = events;
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

// Fix for missing addPrescription
export const addPrescription = async (presc: Prescription) => {
  state.prescriptions = [presc, ...state.prescriptions];
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('prescriptions').insert(toSnake(presc));
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addTask = async (task: Task) => {
  state.tasks = [task, ...state.tasks];
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('tasks').insert(toSnake(task));
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateTask = async (task: Task) => {
  state.tasks = state.tasks.map((t: Task) => t.id === task.id ? task : t);
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('tasks').upsert(toSnake(task));
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

// Fix for missing markAlertRead
export const markAlertRead = (alertId: string) => {
  state.alerts = state.alerts.map((a: any) => a.id === alertId ? { ...a, isRead: true } : a);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};
