import { Patient, Appointment, Prescription, PreInvoice, UserSession, Transmission, Message } from '../types';
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

let state: any = {
  patients: [],
  appointments: [],
  prescriptions: [],
  transmissions: [],
  chatMessages: [],
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
      twilioWebhookUrl: '',
      n8nApiKey: '',
      resendKey: '',
      googleCalendarSync: false
    }
  }
};

export const initStore = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    loadLocalData();
    return;
  }

  try {
    const results = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('patients').select('*'),
      supabase.from('appointments').select('*'),
      supabase.from('transmissions').select('*').order('timestamp', { ascending: false }),
      supabase.from('messages').select('*').order('created_at', { ascending: false }),
      supabase.from('alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(50)
    ]);

    const [u, p, a, tr, m, al, l] = results;

    state = {
      ...state,
      users: (u.data || []).map((user: any) => ({ id: user.id, firstName: user.first_name, lastName: user.last_name, role: user.role, pin: user.pin, active: user.active })),
      patients: (p.data || []).map((pat: any) => ({ ...pat, firstName: pat.first_name, lastName: pat.last_name, careType: pat.care_type, isALD: pat.is_ald })),
      appointments: (a.data || []).map((apt: any) => ({ id: apt.id, patient_id: apt.patient_id, nurse_id: apt.nurse_id, date_time: apt.date_time, status: apt.status })),
      transmissions: (tr.data || []),
      messages: (m.data || []).map((msg: any) => ({ id: msg.id, patientId: msg.patient_id, direction: msg.direction, text: msg.text, timestamp: msg.created_at, status: msg.status })),
      alerts: (al.data || []).map((alert: any) => ({ id: alert.id, title: alert.title, message: alert.message, date: alert.created_at, isRead: alert.is_read })),
      logs: (l.data || []).map((log: any) => ({ id: log.id, action: log.action, user: log.user_id, timestamp: log.created_at }))
    };

    saveOffline();
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch (error) {
    loadLocalData();
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

export const addTransmission = (trans: Transmission) => {
  state.transmissions = [trans, ...state.transmissions];
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const markTransmissionReceived = (transId: string, userId: string) => {
  const trans = state.transmissions.find((t: any) => t.id === transId);
  if (trans) {
    trans.status = 'received';
    trans.readAt = new Date().toISOString();
    saveOffline();
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  }
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

export const addPrescription = (presc: Prescription) => {
  state.prescriptions = [presc, ...state.prescriptions];
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