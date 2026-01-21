
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

    // Explicit mappings for standard schema
    if (key === 'birth_date') camelKey = 'birthDate';
    if (key === 'zip_code') camelKey = 'zipCode';
    if (key === 'medecin_traitant') camelKey = 'medecinTraitant';
    if (key === 'contact_urgence') camelKey = 'contactUrgence';
    if (key === 'care_type') camelKey = 'careType';
    if (key === 'is_ald') camelKey = 'isALD';
    if (key === 'google_drive_folder_id') camelKey = 'googleDriveFolderId';
    if (key === 'created_by') camelKey = 'createdBy';
    if (key === 'assigned_nurse_ids') camelKey = 'assignedNurseIds';
    if (key === 'is_demo') camelKey = 'isDemo';
    if (key === 'last_active_at') camelKey = 'lastActiveAt';
    if (key === 'user_name') camelKey = 'userName';
    if (key === 'user_id') camelKey = 'userId';

    acc[camelKey] = toCamel(obj[key]);
    return acc;
  }, {});
};

// Helper to convert camelCase (App) to snake_case (DB)
const toSnake = (obj: any): any => {
  if (!obj || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);

  return Object.keys(obj).reduce((acc: any, key) => {
    let snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

    // Explicit mappings for standard schema
    if (key === 'birthDate') snakeKey = 'birth_date';
    if (key === 'zipCode') snakeKey = 'zip_code';
    if (key === 'medecinTraitant') snakeKey = 'medecin_traitant';
    if (key === 'contactUrgence') snakeKey = 'contact_urgence';
    if (key === 'careType') snakeKey = 'care_type';
    if (key === 'isALD') snakeKey = 'is_ald';
    if (key === 'googleDriveFolderId') snakeKey = 'google_drive_folder_id';
    if (key === 'createdBy') snakeKey = 'created_by';
    if (key === 'assignedNurseIds') snakeKey = 'assigned_nurse_ids';
    if (key === 'isDemo') snakeKey = 'is_demo';
    if (key === 'lastActiveAt') snakeKey = 'last_active_at';
    if (key === 'userName') snakeKey = 'user_name';
    if (key === 'userId') snakeKey = 'user_id';

    acc[snakeKey] = toSnake(obj[key]);
    return acc;
  }, {});
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
    const [uRes, pRes, aRes, tRes, oRes, taskRes, msgRes, intMsgRes, settingsRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('patients').select('*'),
      supabase.from('appointments').select('*'),
      supabase.from('transmissions').select('*').order('timestamp', { ascending: false }),
      supabase.from('ordonnances').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('messages').select('*'),
      supabase.from('internal_messages').select('*'),
      supabase.from('settings').select('*').eq('id', 'cabinet_main').single()
    ]);

    if (uRes.error) throw uRes.error;
    if (pRes.error) throw pRes.error;
    if (aRes.error) throw aRes.error;
    if (tRes.error) throw tRes.error;
    if (oRes.error) throw oRes.error;
    if (taskRes.error) throw taskRes.error;
    if (msgRes.error) throw msgRes.error;
    if (intMsgRes.error) throw intMsgRes.error;

    const users = toCamel(uRes.data || []);
    const patients = toCamel(pRes.data || []);
    const appointments = toCamel(aRes.data || []);
    const transmissions = toCamel(tRes.data || []);
    const ordonnances = toCamel(oRes.data || []);
    const tasks = toCamel(taskRes.data || []);
    const messages = toCamel(msgRes.data || []);
    const internalMessages = toCamel(intMsgRes.data || []);
    const settings = settingsRes.data ? toCamel(settingsRes.data.data) : state.settings;

    const lRes = await supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(100);
    const logs = toCamel(lRes.data || []);

    // CRITICAL FIX: Merge Supabase data with local data instead of replacing
    // This prevents losing locally-created items that haven't synced yet
    const mergeById = (local: any[], remote: any[]) => {
      const remoteIds = new Set(remote.map((item: any) => item.id));
      const localOnly = local.filter((item: any) => !remoteIds.has(item.id));
      return [...remote, ...localOnly];
    };

    state = {
      ...state,
      dbStatus: 'connected',
      users: mergeById(state.users, users),
      patients: mergeById(state.patients, patients),
      appointments: mergeById(state.appointments, appointments),
      transmissions: mergeById(state.transmissions, transmissions),
      prescriptions: mergeById(state.prescriptions, ordonnances),
      tasks: mergeById(state.tasks, tasks),
      messages: mergeById(state.messages, messages),
      internalMessages: mergeById(state.internalMessages, internalMessages),
      settings: settings || state.settings,
      logs: logs.length ? logs : state.logs
    };
    saveOffline();
    console.log("[Store] Supabase sync complete, merged data:", {
      patients: state.patients.length,
      appointments: state.appointments.length
    });
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

export const updateSettings = async (settingsUpdate: Partial<Settings>) => {
  state.settings = { ...state.settings, ...settingsUpdate, apiConfig: { ...state.settings.apiConfig, ...(settingsUpdate.apiConfig || {}) } };
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('settings').upsert({ id: 'cabinet_main', data: toSnake(state.settings) });
  }
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
    addLog(`Connexion réussie : ${session.name}`);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    return true;
  }
  return false;
};

export const logout = () => { localStorage.removeItem(SESSION_KEY); window.dispatchEvent(new CustomEvent(UPDATE_EVENT)); };

export const addLog = async (action: string) => {
  const session = getCurrentSession();
  const log = {
    id: generateUUID(),
    action,
    userName: session?.name || 'Système',
    userId: session?.userId,
    timestamp: new Date().toISOString()
  };
  state.logs = [log, ...state.logs.slice(0, 99)];
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('logs').insert(toSnake(log));
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const trackActivity = async () => {
  const session = getCurrentSession();
  if (!session) return;
  const supabase = getSupabaseClient();
  if (supabase) {
    // Update self
    await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', session.userId);
    // Fetch others
    const { data } = await supabase.from('users').select('id, last_active_at');
    if (data) {
      const activityMap = new Map(data.map((u: any) => [u.id, u.last_active_at]));
      state.users = state.users.map((u: User) => ({
        ...u,
        lastActiveAt: activityMap.get(u.id) || u.lastActiveAt
      }));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    }
  }
};

export const getActiveUserCount = () => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  return state.users.filter((u: User) => u.lastActiveAt && u.lastActiveAt > tenMinutesAgo).length;
};

export const updatePatient = async (patient: Patient) => {
  state.patients = state.patients.map((p: any) => p.id === patient.id ? patient : p);
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('patients').upsert(toSnake(patient));
  }
  saveOffline();
  addLog(`Mise à jour du dossier patient : ${patient.firstName} ${patient.lastName}`);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addPatient = async (patient: Patient) => {
  console.log("[Store] Adding patient:", patient);
  state.patients = [...state.patients, patient];
  const supabase = getSupabaseClient();
  if (supabase) {
    console.log("[Store] Syncing to Supabase...");
    const { data, error } = await supabase.from('patients').insert(toSnake(patient));
    if (error) {
      console.error("[Store] Supabase insert error:", error);
    } else {
      console.log("[Store] Supabase insert success:", data);
    }
  } else {
    console.warn("[Store] Supabase not configured, patient saved locally only");
  }
  saveOffline();
  addLog(`Création d'un nouveau patient : ${patient.firstName} ${patient.lastName}`);
  console.log("[Store] Patient saved to localStorage");
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const deletePatient = async (patientId: string) => {
  state.patients = state.patients.filter((p: Patient) => p.id !== patientId);
  // Also delete associated data to maintain clean DB (optional but recommended)
  const supabase = getSupabaseClient();
  if (supabase) {
    await Promise.all([
      supabase.from('patients').delete().eq('id', patientId),
      supabase.from('appointments').delete().eq('patient_id', patientId),
      supabase.from('transmissions').delete().eq('patient_id', patientId)
    ]);
  }
  saveOffline();
  addLog(`Suppression d'un dossier patient`);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addTransmission = async (trans: Transmission) => {
  state.transmissions = [trans, ...state.transmissions];
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('transmissions').insert(toSnake(trans));
  }
  saveOffline();
  addLog(`Nouvelle transmission transmise`);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const saveStore = async (newState: Partial<any>) => {
  state = { ...state, ...newState };
  const supabase = getSupabaseClient();
  if (supabase && newState.messages) {
    // If messages were updated (usually in MessagesView), sync the new ones
    // This is a simple implementation, for production use a dedicated addMessage function
    const newMsg = newState.messages[0];
    if (newMsg && !newMsg.id.startsWith('demo')) {
      await supabase.from('messages').upsert(toSnake(newMsg));
    }
  }
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
  addLog(`Mise à jour d'un rendez-vous`);
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

export const addInternalMessage = async (msg: any) => {
  state.internalMessages = [...(state.internalMessages || []), msg];
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('internal_messages').insert(toSnake(msg));
  }
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const deleteUser = async (userId: string) => {
  state.users = state.users.filter((u: User) => u.id !== userId);
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('users').delete().eq('id', userId);
  }
  saveOffline();
  addLog(`Suppression d'un membre du staff (ID: ${userId})`);
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
  addLog(`${exists ? 'Modification' : 'Création'} du profil staff : ${user.firstName} ${user.lastName}`);
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
    await supabase.from('ordonnances').insert(toSnake(presc));
  }
  saveOffline();
  addLog(`Nouvelle ordonnance ajoutée`);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const addTask = async (task: Task) => {
  state.tasks = [task, ...state.tasks];
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('tasks').insert(toSnake(task));
  }
  saveOffline();
  addLog(`Nouvelle tâche créée`);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateTask = async (task: Task) => {
  state.tasks = state.tasks.map((t: Task) => t.id === task.id ? task : t);
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('tasks').upsert(toSnake(task));
  }
  saveOffline();
  addLog(`Mise à jour d'une tâche`);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

// Fix for missing markAlertRead
export const markAlertRead = (alertId: string) => {
  state.alerts = state.alerts.map((a: any) => a.id === alertId ? { ...a, isRead: true } : a);
  saveOffline();
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};
