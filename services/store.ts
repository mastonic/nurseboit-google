
import { Patient, Appointment, Prescription, PreInvoice, UserSession, Transmission, Task, User, Settings } from '../types';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS, MOCK_INVOICES, MOCK_PRESCRIPTIONS, MOCK_NURSES } from '../constants';
import { createClient } from '@supabase/supabase-js';

const SESSION_KEY = 'nursebot_session';
const OFFLINE_DATA_KEY = 'nursebot_offline_data';
const UPDATE_EVENT = 'nursebot-store-update';

let state: any = {
  dbStatus: 'loading',
  dbError: null,
  patients: [],
  appointments: [],
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
  
  if (!url || !key || url.includes('YOUR_') || url === '') return null;
  try {
    return createClient(url, key);
  } catch (e) {
    return null;
  }
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

    state = {
      ...state,
      dbStatus: 'connected',
      users: uRes.data?.length ? uRes.data : state.users,
      patients: pRes.data?.length ? pRes.data : state.patients,
      appointments: aRes.data?.length ? aRes.data : state.appointments,
      transmissions: tRes.data?.length ? tRes.data : state.transmissions
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
      // Deep merge pour éviter de perdre des réglages
      state = { 
        ...state, 
        ...parsed,
        settings: {
          ...state.settings,
          ...(parsed.settings || {}),
          apiConfig: {
            ...state.settings.apiConfig,
            ...(parsed.settings?.apiConfig || {})
          }
        }
      };
    } catch (e) {
      console.error("Erreur de lecture locale", e);
    }
  } else {
    state.users = MOCK_NURSES.map(u => ({ ...u, firstName: u.name.split(' ')[0], lastName: u.name.split(' ')[1], pin: '1234', active: true }));
    state.patients = MOCK_PATIENTS;
    state.appointments = MOCK_APPOINTMENTS;
    state.prescriptions = MOCK_PRESCRIPTIONS;
    state.invoices = MOCK_INVOICES;
    saveOffline();
  }
};

const saveOffline = () => {
  localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(state));
};

export const getStore = () => state;

export const subscribeToStore = (callback: () => void) => {
  window.addEventListener(UPDATE_EVENT, callback);
  return () => window.removeEventListener(UPDATE_EVENT, callback);
};

export const updateSettings = (settingsUpdate: Partial<Settings>) => {
  // Deep merge strict
  const newApiConfig = {
    ...state.settings.apiConfig,
    ...(settingsUpdate.apiConfig || {})
  };

  state.settings = { 
    ...state.settings, 
    ...settingsUpdate,
    apiConfig: newApiConfig
  };

  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  
  if (settingsUpdate.apiConfig?.supabaseUrl || settingsUpdate.apiConfig?.supabaseKey) {
    initStore();
  }
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

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addLog = (action: string, userId: string = 'system') => {
  const user = getCurrentSession();
  const localLog = { id: Date.now().toString(), action, user: user?.name || 'Système', timestamp: new Date().toISOString() };
  state.logs = [localLog, ...state.logs.slice(0, 49)];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updatePatient = (patient: Patient) => {
  state.patients = state.patients.map((p: any) => p.id === patient.id ? patient : p);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addTransmission = (trans: Transmission) => {
  state.transmissions = [trans, ...state.transmissions];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const saveStore = (newState: Partial<any>) => {
  state = { ...state, ...newState };
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addPrescription = (presc: Prescription) => {
  state.prescriptions = [presc, ...state.prescriptions];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateAppointment = (apt: Appointment) => {
  state.appointments = state.appointments.map((a: any) => a.id === apt.id ? apt : a);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateInvoice = (inv: PreInvoice) => {
  state.invoices = state.invoices.map((i: any) => i.id === inv.id ? inv : i);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addTask = (task: Task) => {
  state.tasks = [task, ...state.tasks];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateTask = (task: Task) => {
  state.tasks = state.tasks.map((t: any) => t.id === task.id ? task : t);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const markAlertRead = (id: string) => {
  state.alerts = state.alerts.map((a: any) => a.id === id ? { ...a, isRead: true } : a);
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

export const markTransmissionReceived = (transId: string, userId: string) => {
  state.transmissions = state.transmissions.map((t: Transmission) => 
    t.id === transId ? { ...t, status: 'closed', acknowledgedBy: userId, acknowledgedAt: new Date().toISOString() } : t
  );
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const calculateInvoiceTotal = (acts: any[], displacement: any, majorations: any[]) => {
  const actsTotal = acts.reduce((sum, a) => sum + (a.amount || 0), 0);
  const majTotal = majorations.reduce((sum, m) => sum + (m.amount || 0), 0);
  return actsTotal + majTotal + (displacement?.amount || 0);
};
