
import { Patient, Appointment, Prescription, PreInvoice, UserSession, Transmission, Message, Task, User, Role } from '../types';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS, MOCK_INVOICES, MOCK_PRESCRIPTIONS, MOCK_NURSES } from '../constants';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const getSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_')) return null;
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    return null;
  }
};

const SESSION_KEY = 'nursebot_session';
const UPDATE_EVENT = 'nursebot-store-update';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  path: string;
  isRead: boolean;
  date: string;
}

let state: any = {
  dbStatus: 'loading',
  patients: [],
  appointments: [],
  prescriptions: [],
  transmissions: [],
  chatMessages: [],
  internalMessages: [],
  invoices: [],
  users: [],
  tasks: [],
  messages: [], // WhatsApp history
  alerts: [],
  logs: [],
  notifications: [],
  settings: {
    cabinetName: 'Cabinet Infirmier Pro',
    workingHoursStart: '06:00',
    workingHoursEnd: '21:00',
    defaultCareDuration: 20,
    apiConfig: {
      twilioSid: '',
      twilioToken: '',
      twilioPhone: '',
      twilioWebhookUrl: process.env.VITE_N8N_BASE_URL || '',
      n8nApiKey: process.env.VITE_N8N_API_KEY || '',
      resendKey: '',
      googleCalendarSync: false
    }
  }
};

export const initStore = async () => {
  const supabase = getSupabase();
  loadLocalData(); // Load local first for speed
  
  if (!supabase) {
    state.dbStatus = 'local';
    return;
  }

  try {
    const { data: pingData, error: pingError } = await supabase.from('users').select('id').limit(1);
    if (pingError) throw pingError;

    const results = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('patients').select('*'),
      supabase.from('appointments').select('*'),
      supabase.from('transmissions').select('*').order('timestamp', { ascending: false }),
      supabase.from('tasks').select('*'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false })
    ]);

    const [u, p, a, tr, t, n] = results;

    state = {
      ...state,
      dbStatus: 'connected',
      users: (u.data || []).map((user: any) => ({ 
        id: user.id, 
        firstName: user.first_name, 
        lastName: user.last_name, 
        role: user.role, 
        pin: user.pin, 
        active: user.active,
        phone: user.phone 
      })),
      patients: (p.data || []).map((pat: any) => ({ ...pat, firstName: pat.first_name, lastName: pat.last_name, careType: pat.care_type, isALD: pat.is_ald })),
      appointments: (a.data || []),
      transmissions: (tr.data || []),
      tasks: (t.data || []),
      notifications: (n.data || [])
    };

    saveOffline();
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch (error) {
    console.warn("Supabase connection failed", error);
    state.dbStatus = 'local';
  }
};

const loadLocalData = () => {
  const localData = localStorage.getItem('nursebot_offline_data');
  if (localData) {
    state = { ...state, ...JSON.parse(localData) };
  } else {
    state = {
      ...state,
      users: MOCK_NURSES.map(u => ({ ...u, firstName: u.name.split(' ')[0], lastName: u.name.split(' ')[1], pin: '1234', active: true })),
      patients: MOCK_PATIENTS,
      appointments: MOCK_APPOINTMENTS,
      prescriptions: MOCK_PRESCRIPTIONS,
      invoices: MOCK_INVOICES,
      tasks: [],
      transmissions: [
        { id: 't1', patientId: 'demo-1', fromId: 'u2', fromName: 'Bertrand Durand', text: 'OBS: Plaie propre.\nVIGILANCE: RAS.\nACTION: Pansement refait.', category: 'clinique', priority: 'low', status: 'sent', timestamp: new Date().toISOString() }
      ],
      logs: [{ id: '1', action: 'Mode Démo Activé', user: 'Système', timestamp: new Date().toISOString() }]
    };
    saveOffline();
  }
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

const saveOffline = () => {
  localStorage.setItem('nursebot_offline_data', JSON.stringify(state));
};

export const getStore = () => state;

export const subscribeToStore = (callback: () => void) => {
  window.addEventListener(UPDATE_EVENT, callback);
  return () => window.removeEventListener(UPDATE_EVENT, callback);
};

export const getCurrentSession = (): UserSession | null => {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  try {
    const parsed = JSON.parse(session);
    if (new Date(parsed.expiresAt) < new Date()) {
      logout();
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
};

export const login = async (userId: string, pin: string): Promise<boolean> => {
  const user = state.users.find((u: any) => u.id === userId && u.pin === pin);
  if (user) {
    setSession(user);
    addLog(`Connexion de ${user.firstName}`, userId);
    return true;
  }
  return false;
};

const setSession = (user: any) => {
  const session: UserSession = {
    userId: user.id,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role as any,
    loginAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

// ACTIONS
export const markTransmissionReceived = (transId: string, userId: string) => {
  state.transmissions = state.transmissions.map((t: Transmission) => 
    t.id === transId ? { ...t, status: 'closed', acknowledgedBy: userId, acknowledgedAt: new Date().toISOString() } : t
  );
  saveOffline();
  addLog(`Transmission ${transId} acquittée par ${userId}`);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addTask = (task: Task) => {
  state.tasks = [task, ...state.tasks];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateTask = (task: Task) => {
  state.tasks = state.tasks.map((t: Task) => t.id === task.id ? task : t);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const upsertUser = (user: User) => {
  const exists = state.users.some((u: User) => u.id === user.id);
  if (exists) {
    state.users = state.users.map((u: User) => u.id === user.id ? user : u);
  } else {
    state.users = [...state.users, user];
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addInternalMessage = (msg: any) => {
  state.internalMessages = [...state.internalMessages, msg];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addLog = (action: string, userId: string = 'system') => {
  const user = getCurrentSession();
  const localLog = { id: Date.now().toString(), action, user: user?.name || 'Système', timestamp: new Date().toISOString() };
  state.logs = [localLog, ...state.logs.slice(0, 49)];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const saveStore = (newState: Partial<any>) => {
  state = { ...state, ...newState };
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateSettings = (settingsUpdate: Partial<any>) => {
  state.settings = { ...state.settings, ...settingsUpdate };
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const calculateInvoiceTotal = (acts: any[], displacement: any, majorations: any[]) => {
  let actsTotal = acts.reduce((sum, a) => sum + a.amount, 0);
  return actsTotal + majorations.reduce((sum, m) => sum + m.amount, 0) + (displacement?.amount || 0);
};

export const addTransmission = (trans: Transmission) => {
  state.transmissions = [trans, ...state.transmissions];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addPrescription = (presc: Prescription) => {
  state.prescriptions = [presc, ...state.prescriptions];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updatePatient = (patient: Patient) => {
  state.patients = state.patients.map((p: any) => p.id === patient.id ? patient : p);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateAppointment = (apt: Appointment) => {
  state.appointments = state.appointments.map((a: any) => a.id === apt.id ? apt : a);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateInvoice = (invoice: PreInvoice) => {
  state.invoices = state.invoices.map((i: any) => i.id === invoice.id ? invoice : i);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const markAlertRead = (id: string) => {
  state.alerts = state.alerts.map((a: any) => a.id === id ? { ...a, isRead: true } : a);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const handleIncomingTwilioMessage = async (payload: { From: string; Body: string }) => {
  const { From, Body } = payload;
  const normalizedFrom = From.replace('+33', '0').replace(/\s/g, '');
  const patient = state.patients.find((p: Patient) => p.phone.replace(/\s/g, '') === normalizedFrom);
  
  if (patient) {
    const newMessage: Message = {
      id: Date.now().toString(),
      patientId: patient.id,
      direction: 'inbound',
      text: Body,
      timestamp: new Date().toISOString(),
      status: 'read'
    };
    state.messages = [newMessage, ...state.messages];
    saveOffline();
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    return { role: 'patient' as const, user: patient };
  }
  return { role: 'unknown' as const };
};
