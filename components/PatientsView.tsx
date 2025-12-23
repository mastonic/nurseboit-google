
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getStore, addLog, saveStore, updatePatient, subscribeToStore, getCurrentSession } from '../services/store';
import { Patient } from '../types';

const PatientsView: React.FC = () => {
  const session = getCurrentSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [store, setStore] = useState(getStore());
  const [viewMode, setViewMode] = useState<'me' | 'cabinet'>(session?.role === 'admin' ? 'cabinet' : 'me');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      setStore(getStore());
    });
  }, []);

  const patients = useMemo(() => {
    if (viewMode === 'me' && session) {
      // Patients qui ont au moins un RDV avec l'utilisateur connecté
      const myPatientIds = store.appointments
        .filter(a => a.nurseId === session.userId)
        .map(a => a.patientId);
      return store.patients.filter(p => myPatientIds.includes(p.id) || p.createdBy === session.userId);
    }
    return store.patients;
  }, [store.patients, store.appointments, viewMode, session]);

  const filteredPatients = patients.filter(p => 
    p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  );

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;
    const formData = new FormData(e.currentTarget);
    const patientData: any = Object.fromEntries(formData.entries());

    if (modalMode === 'add') {
      const newPatient: Patient = { ...patientData, id: `p-${Date.now()}`, createdBy: session.userId };
      saveStore({ patients: [...store.patients, newPatient] });
      addLog(`Nouveau patient créé`, session.userId);
    } else if (modalMode === 'edit' && selectedPatient) {
      // Une infirmière ne peut modifier que "ses" patients (liés à ses RDV ou créés par elle)
      const canEdit = session.role !== 'infirmiere' || patients.some(p => p.id === selectedPatient.id);
      if (!canEdit) {
         alert("Vous n'êtes pas autorisée à modifier ce dossier.");
         return;
      }
      updatePatient({ ...selectedPatient, ...patientData });
    }
    setModalMode(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dossiers Patients</h1>
          <p className="text-slate-500 text-sm font-medium tracking-tight">Mode : {viewMode === 'me' ? 'Mes Patients' : 'Cabinet'}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mr-2">
             <button onClick={() => setViewMode('me')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'me' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Moi</button>
             <button onClick={() => setViewMode('cabinet')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'cabinet' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Cabinet</button>
          </div>
          <button 
            onClick={() => { setSelectedPatient(null); setModalMode('add'); }}
            className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all"
          >
            <i className="fa-solid fa-user-plus"></i>
            Nouveau Patient
          </button>
        </div>
      </div>

      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input 
          type="text" 
          placeholder="Rechercher..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-all group relative">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setSelectedPatient(patient); setModalMode('edit'); }} className="p-2 text-slate-400 hover:text-emerald-500"><i className="fa-solid fa-pen"></i></button>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center font-black mb-4">
              {patient.lastName[0]}
            </div>
            <h3 className="font-black text-lg text-slate-900 leading-tight">{patient.lastName} {patient.firstName}</h3>
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mt-1 mb-3">{patient.careType}</p>
            <div className="space-y-1 text-xs font-bold text-slate-400 italic">
               <p><i className="fa-solid fa-phone mr-2"></i>{patient.phone}</p>
               <p className="truncate"><i className="fa-solid fa-location-dot mr-2"></i>{patient.address}</p>
            </div>
          </div>
        ))}
      </div>

      {modalMode && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <form onSubmit={handleSave} className="bg-white w-full max-w-xl rounded-3xl shadow-2xl animate-in zoom-in duration-200">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-black text-xl">{modalMode === 'add' ? 'Créer un patient' : 'Modifier'}</h3>
                  <button type="button" onClick={() => setModalMode(null)} className="text-slate-300 hover:text-slate-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
               </div>
               <div className="p-8 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <input name="lastName" required placeholder="Nom" defaultValue={selectedPatient?.lastName} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                     <input name="firstName" required placeholder="Prénom" defaultValue={selectedPatient?.firstName} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                  </div>
                  <input name="phone" required placeholder="Téléphone" defaultValue={selectedPatient?.phone} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                  <input name="address" required placeholder="Adresse" defaultValue={selectedPatient?.address} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                  <input name="careType" placeholder="Soins (ex: Dialyse)" defaultValue={selectedPatient?.careType} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                  <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs">Enregistrer</button>
               </div>
            </form>
         </div>
      )}
    </div>
  );
};

export default PatientsView;
