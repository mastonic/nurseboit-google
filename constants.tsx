
import React from 'react';
import { Patient, Appointment, PreInvoice, Prescription } from './types';

export const NGAP_CATALOG = [
  { code: 'AMI 1', label: 'Injection sous-cutanée', amount: 3.15 },
  { code: 'AMI 2', label: 'Injection intra-musculaire', amount: 6.30 },
  { code: 'AIS 3', label: 'Séance de soins infirmiers (30 min)', amount: 7.95 },
  { code: 'BSI', label: 'Bilan de soins infirmiers', amount: 25.00 },
  { code: 'AMI 4', label: 'Pansement complexe', amount: 12.60 }
];

export const MOCK_NURSES = [
  { id: 'n1', name: 'Alice Martin', role: 'nurse' as const },
  { id: 'n2', name: 'Bertrand Durand', role: 'nurse' as const },
  { id: 'n3', name: 'Carine Lefebvre', role: 'nurse' as const }
];

export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'p1',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '0612345678',
    address: '12 Rue de la Paix, Paris',
    careType: 'Pansement',
    recurrence: 'Journalier',
    notes: 'Patient diabétique',
    mutuelle: 'MGEN'
  },
  {
    id: 'p2',
    firstName: 'Marie',
    lastName: 'Curie',
    phone: '0788990011',
    address: '5 Avenue des Sciences, Lyon',
    careType: 'Injection',
    recurrence: 'Hebdomadaire',
    notes: 'Allergie pénicilline'
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'a1', patientId: 'p1', nurseId: 'n1', dateTime: '2024-05-20T08:00:00', durationMinutes: 30, type: 'care', status: 'scheduled' },
  { id: 'a2', patientId: 'p2', nurseId: 'n2', dateTime: '2024-05-20T10:30:00', durationMinutes: 15, type: 'care', status: 'scheduled' }
];

export const MOCK_INVOICES: PreInvoice[] = [
  { 
    id: 'i1', 
    patientId: 'p1', 
    date: '2024-05-18', 
    acts: [{ code: 'AMI 4', label: 'Pansement complexe', amount: 12.60 }],
    majorations: [],
    displacement: { type: 'IFI', distance: 0, amount: 2.50 },
    totalAmount: 15.10,
    status: 'to_prepare' 
  },
  { 
    id: 'i2', 
    patientId: 'p2', 
    date: '2024-05-15', 
    acts: [{ code: 'AMI 1', label: 'Injection', amount: 3.15 }],
    majorations: [{ label: 'Dimanche', amount: 8.50 }],
    displacement: { type: 'IFI', distance: 0, amount: 2.50 },
    totalAmount: 14.15,
    status: 'rejected',
    rejectionReason: 'Code acte erroné'
  }
];

export const MOCK_PRESCRIPTIONS: Prescription[] = [
  { 
    id: 'pr1', 
    patientId: 'p1', 
    prescriberName: 'Dr. House', 
    datePrescribed: '2024-04-01', 
    dateExpiry: '2024-06-01', 
    careDetails: 'Pansements quotidiens pendant 2 mois',
    status: 'active'
  }
];
