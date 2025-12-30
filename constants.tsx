
import { Patient, Appointment, PreInvoice, Prescription } from './types';

export const NGAP_CATALOG = [
  { code: 'AMI 1', label: 'Injection sous-cutanée', amount: 3.15 },
  { code: 'AMI 2', label: 'Injection intra-musculaire', amount: 6.30 },
  { code: 'AIS 3', label: 'Séance de soins infirmiers (30 min)', amount: 7.95 },
  { code: 'BSI', label: 'Bilan de soins infirmiers', amount: 25.00 },
  { code: 'AMI 4', label: 'Pansement complexe', amount: 12.60 },
  { code: 'AMI 5.1', label: 'Injection insuline + surveillance', amount: 16.00 }
];

export const MOCK_NURSES = [
  { id: 'u1', name: 'Alice Martin', role: 'admin' },
  { id: 'u2', name: 'Bertrand Durand', role: 'infirmiere' },
  { id: 'u3', name: 'Carine Lefebvre', role: 'infirmiereAdmin' }
];

export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'demo-1',
    firstName: 'Marie',
    lastName: 'Lefebvre',
    phone: '0612345678',
    address: '24 Rue des Lilas, 75020 Paris',
    careType: 'Pansement V.A.C (Malléole)',
    recurrence: 'Quotidien',
    notes: 'Diabétique de type 2. Surveiller l\'aspect de la plaie (oedème ++).',
    isALD: true,
    allergies: ['Pénicilline'],
    pathologies: ['Diabète', 'HTA'],
    createdBy: 'u1'
  },
  {
    id: 'demo-2',
    firstName: 'Jean',
    lastName: 'Petit',
    phone: '0788990011',
    address: '12 Avenue Gambetta, 69003 Lyon',
    careType: 'Insuline + Surveillance',
    recurrence: '3x par jour',
    notes: 'Patient souvent désorienté le matin. Risque de chute.',
    isALD: true,
    pathologies: ['Alzheimer débutant'],
    createdBy: 'u1'
  },
  {
    id: 'demo-3',
    firstName: 'Lucette',
    lastName: 'Richard',
    phone: '0655443322',
    address: '8 Boulevard Voltaire, 75011 Paris',
    careType: 'Injections quotidiennes',
    recurrence: '1x par jour',
    notes: 'Traitement anticoagulant post-phlébite.',
    isALD: false,
    createdBy: 'u3'
  }
];

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'a1', patientId: 'demo-1', nurseId: 'u1', dateTime: `${today}T08:00:00`, durationMinutes: 30, type: 'care', status: 'done', createdBy: 'u1' },
  { id: 'a2', patientId: 'demo-2', nurseId: 'u1', dateTime: `${today}T08:45:00`, durationMinutes: 20, type: 'care', status: 'scheduled', createdBy: 'u1' },
  { id: 'a3', patientId: 'demo-3', nurseId: 'u2', dateTime: `${today}T09:15:00`, durationMinutes: 15, type: 'care', status: 'scheduled', createdBy: 'u1' },
  { id: 'a4', patientId: 'demo-1', nurseId: 'u1', dateTime: `${tomorrow}T08:00:00`, durationMinutes: 30, type: 'care', status: 'scheduled', createdBy: 'u1' }
];

export const MOCK_INVOICES: PreInvoice[] = [
  { 
    id: 'i1', 
    patientId: 'demo-1', 
    date: today, 
    acts: [{ code: 'AMI 4', label: 'Pansement complexe', amount: 12.60 }],
    majorations: [],
    displacement: { type: 'IFI', distance: 0, amount: 2.50 },
    totalAmount: 15.10,
    status: 'to_prepare',
    createdBy: 'u1'
  }
];

export const MOCK_PRESCRIPTIONS: Prescription[] = [
  { 
    id: 'pr1', 
    patientId: 'demo-1', 
    prescriberName: 'Dr. Legrand', 
    datePrescribed: '2024-05-01', 
    dateExpiry: '2024-07-01', 
    careDetails: 'Pansements quotidiens V.A.C pendant 2 mois',
    status: 'active',
    createdBy: 'u1'
  }
];
