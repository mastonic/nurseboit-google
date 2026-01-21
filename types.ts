
export type Role = 'admin' | 'infirmiere' | 'infirmiereAdmin' | 'patient';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  email?: string;
  avatar?: string;
  pin: string;
  active: boolean;
  calendarId?: string;
  lastActiveAt?: string;
}

export interface Log {
  id: string;
  action: string;
  userName: string;
  userId?: string;
  timestamp: string;
}

export interface UserSession {
  userId: string;
  name: string;
  role: Role;
  loginAt: string;
  expiresAt: string;
}

export interface Transmission {
  id: string;
  patientId: string;
  fromId: string;
  fromName: string;
  toId?: string;
  toName?: string;
  text: string;
  category: 'clinique' | 'social' | 'logistique' | 'urgence';
  priority: 'low' | 'medium' | 'high';
  status: 'draft' | 'sent' | 'received' | 'closed';
  timestamp: string;
  readAt?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  isDemo?: boolean;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city?: string;
  zipCode?: string;
  email?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'Autre';
  nir?: string;
  medecinTraitant?: string;
  contactUrgence?: string;
  careType: string;
  recurrence: string;
  pathologies?: string[];
  allergies?: string[];
  protocoles?: string;
  notes: string;
  isALD: boolean;
  mutuelle?: string;
  googleDriveFolderId?: string;
  documents?: { id: string; name: string; type: string; url: string; date: string }[];
  archived?: boolean;
  createdBy?: string;
  assignedNurseIds?: string[];
  isDemo?: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  nurseId: string;
  dateTime: string;
  durationMinutes: number;
  type: 'care' | 'admin' | 'meeting';
  status: 'scheduled' | 'done' | 'cancelled';
  notes?: string;
  recurrent?: boolean;
  googleCalendarEventId?: string;
  createdBy?: string;
  isDemo?: boolean;
}

export interface Prescription {
  id: string;
  patientId: string;
  prescriberName: string;
  prescriberRpps?: string;
  datePrescribed: string;
  dateExpiry: string;
  careDetails: string;
  imageUrl?: string;
  status: 'active' | 'expiring' | 'expired';
  createdBy?: string;
}

export interface PreInvoice {
  id: string;
  patientId: string;
  date: string;
  acts: { code: string; label: string; amount: number }[];
  majorations: { label: string; amount: number }[];
  displacement: {
    type: 'IFI' | 'IK';
    distance: number;
    amount: number;
  };
  totalAmount: number;
  status: 'to_prepare' | 'prepared' | 'sent' | 'paid' | 'rejected';
  createdBy?: string;
}

export interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  ownerId: string;
  patientId?: string;
  status: 'todo' | 'done';
}

export interface Message {
  id: string;
  patientId: string;
  direction: 'inbound' | 'outbound';
  text: string;
  timestamp: string;
  status: 'read' | 'sent' | 'received' | 'error';
}

export interface ApiConfig {
  twilioSid: string;
  twilioToken: string;
  twilioPhone: string;
  whatsappPhone?: string;
  twilioWebhookUrl: string;
  n8nApiKey: string;
  n8nBaseUrl?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  resendKey: string;
  googleCalendarSync: boolean;
}

export interface Settings {
  cabinetName: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  defaultCareDuration: number;
  apiConfig: ApiConfig;
}
