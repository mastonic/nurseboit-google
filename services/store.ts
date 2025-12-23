
import { Patient, Appointment, Prescription, PreInvoice, User, Task, Message, Alert, ApiConfig, McpServer, UserSession } from '../types';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS, MOCK_PRESCRIPTIONS, MOCK_INVOICES, MOCK_NURSES } from '../constants';

const STORAGE_KEY = 'nursebot_beta_v1_state';
const SESSION_KEY = 'nursebot_session';
const UPDATE_EVENT = 'nursebot-store-update';

interface AppSettings {
  cabinetName: string;
  cabinetPhone: string;
  cabinetAddress: string;
  defaultCareDuration: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  autoArchivePrescriptions: boolean;
  smsRemindersEnabled: boolean;
  prescriptionCheckEnabled: boolean;
  apiConfig: ApiConfig;
  mcpServers: McpServer[];
}

interface AppState {
  patients: Patient[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  invoices: PreInvoice[];
  users: User[];
  tasks: Task[];
  messages: Message[];
  alerts: Alert[];
  settings: AppSettings;
  logs: { id: string; timestamp: string; action: string; user: string; userId: string; mode: string }[];
}

const INITIAL_USERS: User[] = [
  { id: 'u1', firstName: 'Alice', lastName: 'Martin', role: 'admin', pin: '1234', active: true },
  { id: 'u2', firstName: 'Bertrand', lastName: 'Durand', role: 'infirmiere', pin: '2222', active: true },
  { id: 'u3', firstName: 'Carine', lastName: 'Lefebvre', role: 'infirmiereAdmin', pin: '3333', active: true }
];

const loadInitialState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  let state: AppState;

  if (saved) {
    state = JSON.parse(saved);
  } else {
    state = {
      patients: MOCK_PATIENTS,
      appointments: MOCK_APPOINTMENTS,
      prescriptions: MOCK_PRESCRIPTIONS,
      invoices: MOCK_INVOICES,
      users: INITIAL_USERS,
      tasks: [
        { id: 't1', title: 'Renouveler BSI Dupont', ownerId: 'u1', deadline: '2024-05-25', status: 'todo', priority: 'high', createdBy: 'u1' }
      ],
      messages: [
        { id: 'm1', patientId: 'p1', direction: 'inbound', text: 'Est-ce que vous passez bien à 8h demain ?', timestamp: new Date().toISOString(), status: 'read' }
      ],
      alerts: [
        { id: 'a1', type: 'prescription', title: 'Ordonnance expirée', message: 'Jean Dupont : Pansements', date: new Date().toISOString(), path: '/prescriptions', isRead: false, patientId: 'p1' }
      ],
      settings: {
        cabinetName: 'Cabinet des Alizés',
        cabinetPhone: '01 23 45 67 89',
        cabinetAddress: '12 rue de la République, 75001 Paris',
        defaultCareDuration: 30,
        workingHoursStart: '06:00',
        workingHoursEnd: '20:00',
        autoArchivePrescriptions: false,
        smsRemindersEnabled: true,
        prescriptionCheckEnabled: true,
        apiConfig: {
          twilioSid: '',
          twilioToken: '',
          twilioPhone: '',
          resendKey: '',
          googleCalendarSync: true
        },
        mcpServers: [
          { id: 'mcp-1', name: 'Base Vidal Cloud', url: 'https://mcp.vidal.fr/v1', status: 'connected', type: 'medical_db' },
          { id: 'mcp-2', name: 'Annuaire Santé RPPS', url: 'https://api.rpps.sante.gouv.fr', status: 'connected', type: 'rpps_directory' }
        ]
      },
      logs: [{ id: '1', timestamp: new Date().toISOString(), action: 'Initialisation du cabinet', user: 'Système', userId: 'system', mode: 'cabinet' }]
    };
  }

  const adminId = state.users.find(u => u.role === 'admin')?.id || 'u1';
  state.patients = state.patients.map(p => ({ ...p, createdBy: p.createdBy || adminId }));
  state.appointments = state.appointments.map(a => ({ ...a, createdBy: a.createdBy || adminId }));
  state.prescriptions = state.prescriptions.map(p => ({ ...p, createdBy: p.createdBy || adminId }));
  state.invoices = state.invoices.map(i => ({ ...i, createdBy: i.createdBy || adminId }));
  state.tasks = state.tasks.map(t => ({ ...t, createdBy: t.createdBy || adminId }));

  return state;
};

let currentState = loadInitialState();

export const getStore = () => currentState;

export const getCurrentSession = (): UserSession | null => {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  const parsed: UserSession = JSON.parse(session);
  if (new Date(parsed.expiresAt) < new Date()) {
    logout();
    return null;
  }
  return parsed;
};

export const login = (userId: string, pin: string): boolean => {
  const user = currentState.users.find(u => u.id === userId && u.pin === pin);
  if (user) {
    const session: UserSession = {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      loginAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    addLog(`Connexion réussie`, user.id);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    return true;
  }
  return false;
};

export const logout = () => {
  const session = getCurrentSession();
  if (session) addLog(`Déconnexion`, session.userId);
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const saveStore = (newState: Partial<AppState>) => {
  currentState = { ...currentState, ...newState };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const updateSettings = (settings: Partial<AppSettings>) => {
  const session = getCurrentSession();
  const newApiConfig = settings.apiConfig 
    ? { ...currentState.settings.apiConfig, ...settings.apiConfig }
    : currentState.settings.apiConfig;

  const updatedSettings = { 
    ...currentState.settings, 
    ...settings,
    apiConfig: newApiConfig
  };
  
  saveStore({ settings: updatedSettings });
  if (session) addLog(`Paramètres du cabinet mis à jour`, session.userId);
};

export const updateUser = (user: User) => {
  const session = getCurrentSession();
  const users = currentState.users.map(u => u.id === user.id ? user : u);
  saveStore({ users });
  if (session) addLog(`Profil de ${user.firstName} ${user.lastName} mis à jour`, session.userId);
};

export const addLog = (action: string, userId: string = 'system', mode: string = 'cabinet') => {
  const userObj = currentState.users.find(u => u.id === userId);
  const userName = userObj ? `${userObj.firstName} ${userObj.lastName}` : 'Système';
  const logs = [{ 
    id: Date.now().toString(), 
    timestamp: new Date().toISOString(), 
    action, 
    user: userName, 
    userId,
    mode 
  }, ...currentState.logs].slice(0, 500);
  saveStore({ logs });
};

export const canViewCabinetData = (role: string) => role === 'admin' || role === 'infirmiereAdmin';
export const canEditCabinetData = (role: string) => role === 'admin' || role === 'infirmiereAdmin';

export const calculateInvoiceTotal = (acts: any[], displacement: any, majorations: any[]) => {
  const actsTotal = acts.reduce((sum, a) => sum + a.amount, 0);
  const majorationsTotal = majorations.reduce((sum, m) => sum + m.amount, 0);
  const displacementTotal = displacement?.amount || 0;
  return actsTotal + majorationsTotal + displacementTotal;
};

export const checkAppointmentConflict = (nurseId: string, dateTime: string, durationMinutes: number, excludeId?: string) => {
  const newStart = new Date(dateTime).getTime();
  const newEnd = newStart + durationMinutes * 60000;

  return currentState.appointments.some((a) => {
    if (a.id === excludeId || a.nurseId !== nurseId || a.status === 'cancelled') return false;
    const existStart = new Date(a.dateTime).getTime();
    const existEnd = existStart + a.durationMinutes * 60000;
    return newStart < existEnd && existStart < newEnd;
  });
};

export const createAlert = (alert: Omit<Alert, 'id' | 'isRead'>) => {
  const newAlert = { ...alert, id: Date.now().toString(), isRead: false };
  saveStore({ alerts: [newAlert, ...currentState.alerts] });
};

export const markAlertRead = (id: string) => {
  const alerts = currentState.alerts.map(a => a.id === id ? { ...a, isRead: true } : a);
  saveStore({ alerts });
};

export const updatePatient = (patient: Patient) => {
  const session = getCurrentSession();
  const patients = currentState.patients.map(p => p.id === patient.id ? patient : p);
  saveStore({ patients });
  if (session) addLog(`Patient mis à jour : ${patient.lastName}`, session.userId);
};

export const updateAppointment = (apt: Appointment) => {
  const session = getCurrentSession();
  const appointments = currentState.appointments.map(a => a.id === apt.id ? apt : a);
  saveStore({ appointments });
  if (session) addLog(`RDV modifié`, session.userId);
};

export const addPrescription = (presc: Prescription) => {
  const session = getCurrentSession();
  const prescriptions = [presc, ...currentState.prescriptions];
  saveStore({ prescriptions });
  if (session) addLog(`Nouvelle ordonnance : ${presc.id}`, session.userId);
};

export const updatePrescription = (presc: Prescription) => {
  const session = getCurrentSession();
  const prescriptions = currentState.prescriptions.map(p => p.id === presc.id ? presc : p);
  saveStore({ prescriptions });
  if (session) addLog(`Ordonnance modifiée`, session.userId);
};

export const updateInvoice = (inv: PreInvoice) => {
  const session = getCurrentSession();
  const invoices = currentState.invoices.map(i => i.id === inv.id ? inv : i);
  saveStore({ invoices });
  if (session) addLog(`Facture modifiée`, session.userId);
};

export const subscribeToStore = (callback: () => void) => {
  window.addEventListener(UPDATE_EVENT, callback);
  return () => window.removeEventListener(UPDATE_EVENT, callback);
};
