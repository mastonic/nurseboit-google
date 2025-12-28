
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStore, addLog, saveStore, updatePatient, subscribeToStore, getCurrentSession } from '../services/store';
import { Patient } from '../types';

const PatientsView: React.FC = () => {
  const navigate = useNavigate();
  const session = getCurrentSession();
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
      const newPatient: Patient = { 
        ...patientData, 
        id: `p-${Date.now()}`, 
        createdBy: session.userId, 
        isALD: formData.get('isALD') === 'on',
        pathologies: [],
        allergies: [],
        notes: ''
      };
      saveStore({ patients: [...store.patients, newPatient] });
      addLog(`Nouveau patient créé`, session.userId);
    } else if (modalMode === 'edit' && selectedPatient) {
      updatePatient({ ...selectedPatient, ...patientData, isALD: formData.get('isALD') === 'on' });
    }
    setModalMode(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dossiers Patients</h1>
          <p className="text-slate-500 text-sm font-medium tracking-tight">Accédez aux données cliniques et transmissions.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mr-2">
             <button onClick={() => setViewMode('me')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'me' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Mes Patients</button>
             <button onClick={() => setViewMode('cabinet')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'cabinet' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Tout le Cabinet</button>
          </div>
          <button 
            onClick={() => { setSelectedPatient(null); setModalMode('add'); }}
            className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all"
          >
            <i className="fa-solid fa-user-plus"></i>
            Nouveau Dossier
          </button>
        </div>
      </div>

      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input 
          type="text" 
          placeholder="Chercher par nom, prénom ou téléphone..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
          <div 
            key={patient.id} 
            onClick={() => navigate(`/patients/${patient.id}`)}
            className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-xl transition-all group relative cursor-pointer"
          >
            <div className="absolute top-4 right-4 flex gap-2">
                {patient.isALD && <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">ALD</span>}
                <button onClick={(e) => { e.stopPropagation(); setSelectedPatient(patient); setModalMode('edit'); }} className="p-2 text-slate-400 hover:text-emerald-500"><i className="fa-solid fa-pen text-xs"></i></button>
            </div>
            <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center font-black text-xl mb-4 group-hover:scale-110 transition-transform">
              {patient.lastName[0]}
            </div>
            <h3 className="font-black text-xl text-slate-900 leading-tight mb-1">{patient.lastName} {patient.firstName}</h3>
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-4">{patient.careType}</p>
            
            <div className="space-y-2 text-xs font-bold text-slate-400 italic">
               <p className="flex items-center gap-2"><i className="fa-solid fa-phone text-emerald-500/50"></i>{patient.phone}</p>
               <p className="truncate flex items-center gap-2"><i className="fa-solid fa-location-dot text-emerald-500/50"></i>{patient.address}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dossier DPI</span>
               <span className="text-emerald-500 text-[10px] font-black uppercase flex items-center gap-2">
                  Ouvrir le dossier <i className="fa-solid fa-arrow-right"></i>
               </span>
            </div>
          </div>
        ))}
      </div>

      {modalMode && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <form onSubmit={handleSave} className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-black text-2xl">{modalMode === 'add' ? 'Nouveau Dossier Patient' : 'Modifier Identité'}</h3>
                  <button type="button" onClick={() => setModalMode(null)} className="text-slate-300 hover:text-slate-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
               </div>
               <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                        <input name="lastName" required placeholder="DUPONT" defaultValue={selectedPatient?.lastName} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                        <input name="firstName" required placeholder="Jean" defaultValue={selectedPatient?.firstName} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                        <input name="phone" required placeholder="06..." defaultValue={selectedPatient?.phone} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Naissance</label>
                        <input name="birthDate" type="date" defaultValue={selectedPatient?.birthDate} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro NIR (Sécu)</label>
                      <input name="nir" placeholder="1 80 00 00 000 000" defaultValue={selectedPatient?.nir} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse complète</label>
                      <input name="address" required placeholder="12 rue de la Paix" defaultValue={selectedPatient?.address} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                     <input type="checkbox" name="isALD" id="isALD" defaultChecked={selectedPatient?.isALD} className="w-5 h-5 text-emerald-500 rounded border-slate-300" />
                     <label htmlFor="isALD" className="text-sm font-bold text-slate-700">Patient en ALD (100%)</label>
                  </div>
                  <button type="submit" className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 uppercase tracking-widest text-xs mt-4">Enregistrer le Dossier</button>
               </div>
            </form>
         </div>
      )}
    </div>
  );
};

export default PatientsView;
