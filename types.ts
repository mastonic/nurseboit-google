
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
}

export interface UserSession {
  userId: string;
  name: string;
  role: Role;
  loginAt: string;
  expiresAt: string;
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
  careType: string;
  recurrence: string;
  notes: string;
  prescriber?: string;
  mutuelle?: string;
  archived?: boolean;
  createdBy?: string;
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
  createdBy?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  prescriberName: string;
  prescriberRpps?: string;
  datePrescribed: string;
  dateExpiry: string;
  careDetails: string;
  notes?: string;
  status: 'active' | 'expiring' | 'expired';
  scanUrl?: string;
  createdBy?: string;
}

export interface PreInvoice {
  id: string;
  patientId: string;
  date: string;
  acts: { code: string; label: string; amount: number }[];
  majorations: { label: string; amount: number }[];
  displacement: { type: 'IFI' | 'IK'; distance: number; amount: number };
  totalAmount: number;
  status: 'to_prepare' | 'sent' | 'paid' | 'rejected';
  rejectionReason?: string;
  createdBy?: string;
}

export interface Message {
  id: string;
  patientId: string;
  direction: 'inbound' | 'outbound';
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isUrgent?: boolean;
}

export interface Task {
  id: string;
  title: string;
  ownerId: string;
  patientId?: string;
  deadline: string;
  status: 'todo' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdBy?: string;
}

export interface Alert {
  id: string;
  type: 'prescription' | 'billing' | 'message' | 'system';
  patientId?: string;
  userId?: string; // Cible spécifique (si null = tout le cabinet)
  title: string;
  message: string;
  date: string;
  path: string;
  isRead: boolean;
}

export interface McpServer {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  type: 'medical_db' | 'cabinet_hds' | 'rpps_directory';
}

export interface ApiConfig {
  twilioSid: string;
  twilioToken: string;
  twilioPhone: string;
  resendKey: string;
  googleCalendarSync: boolean;
}

export enum AgentType {
  ORCHESTRATOR = 'ORCHESTRATOR',
  PLANNING = 'PLANNING',
  PRESCRIPTION = 'PRESCRIPTION',
  BILLING = 'BILLING'
}
